from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
from functools import wraps

app = Flask(__name__)
CORS(app)

# 配置
app.config['SECRET_KEY'] = 'your_secret_key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# 用户模型
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)

# 创建数据库表
with app.app_context():
    db.create_all()

# 装饰器：验证 token
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.filter_by(id=data['user_id']).first()
        except:
            return jsonify({'message': 'Token is invalid!'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

# 注册路由
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    hashed_password = generate_password_hash(data['password'], method='sha256')
    new_user = User(username=data['username'], password=hashed_password)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': 'Registered successfully'}), 201

# 登录路由
@app.route('/login', methods=['POST'])
def login():
    auth = request.get_json()
    print("here1", auth)
    user = User.query.filter_by(username=auth['username']).first()
    if user and check_password_hash(user.password, auth['password']):
        token = jwt.encode({'user_id': user.id, 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)},
                           app.config['SECRET_KEY'], algorithm="HS256")
        return jsonify({'token': token})
    print("here")
    return jsonify({'message': 'Invalid credentials'}), 401

# 修改密码路由
@app.route('/change_password', methods=['POST'])
@token_required
def change_password(current_user):
    data = request.get_json()
    if check_password_hash(current_user.password, data['old_password']):
        current_user.password = generate_password_hash(data['new_password'], method='sha256')
        db.session.commit()
        return jsonify({'message': 'Password changed successfully'})
    return jsonify({'message': 'Invalid old password'}), 400

if __name__ == '__main__':
    app.run(debug=True)
