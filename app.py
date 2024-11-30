from flask import Flask, request, Response, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime
import datetime as dt
import json
from docx import Document
import time
import os
import uuid
from docx import Document
from docx.oxml.ns import qn
from docx.shared import Pt
from functools import wraps
from gen import generate_lesson_plan, gen_word
import logging
import secrets
import hashlib

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log', encoding='utf-8'),  # 输出到文件
        logging.StreamHandler()  # 同时输出到控制台
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# 配置
app.config['SECRET_KEY'] = 'your_secret_key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)

# 创建数据库表
with app.app_context():
    db.create_all()

# Secure password hashing with salt
def hash_password(password, salt=None):
    if salt is None:
        salt = secrets.token_hex(16)
    
    salted_password = password + salt
    hashed_password = hashlib.sha256(salted_password.encode()).hexdigest()
    
    return hashed_password, salt

# 装饰器：验证 token
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            logger.warning(f'Token missing for route {request.path}')
            return jsonify({'message': 'Token is missing!'}), 401
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.filter_by(id=data['user_id']).first()
            logger.info(f'Token validated for user {current_user.username}')
        except Exception as e:
            logger.error(f'Token validation failed: {str(e)}')
            return jsonify({'message': 'Token is invalid!'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

# 注册路由
@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        hashed_password = generate_password_hash(data['password'], method='sha256')
        new_user = User(username=data['username'], password=hashed_password)
        db.session.add(new_user)
        db.session.commit()
        logger.info(f'User registered: {data["username"]}')
        return jsonify({'message': 'Registered successfully'}), 201
    except Exception as e:
        logger.error(f'Registration failed: {str(e)}')
        return jsonify({'message': 'Registration failed'}), 400

# 登录路由
@app.route('/login', methods=['POST'])
def login():
    try:
        auth = request.get_json()
        user = User.query.filter_by(username=auth['username']).first()
        if user and check_password_hash(user.password, auth['password']):
            token = jwt.encode({'user_id': user.id, 'exp': datetime.utcnow() + dt.timedelta(hours=24)},
                               app.config['SECRET_KEY'], algorithm="HS256")
            logger.info(f'User logged in: {auth["username"]}')
            return jsonify({'token': token})
        logger.warning(f'Login attempt failed for user: {auth["username"]}')
        return jsonify({'message': 'Invalid credentials'}), 401
    except Exception as e:
        logger.error(f'Login process error: {str(e)}')
        return jsonify({'message': 'Login failed'}), 500

# 修改密码路由
@app.route('/change_password', methods=['POST'])
@token_required
def change_password(current_user):
    try:
        data = request.get_json()
        if check_password_hash(current_user.password, data['old_password']):
            current_user.password = generate_password_hash(data['new_password'], method='sha256')
            db.session.commit()
            logger.info(f'Password changed for user: {current_user.username}')
            return jsonify({'message': 'Password changed successfully'})
        logger.warning(f'Password change attempt failed for user: {current_user.username}')
        return jsonify({'message': 'Invalid old password'}), 400
    except Exception as e:
        logger.error(f'Password change error: {str(e)}')
        return jsonify({'message': 'Password change failed'}), 500

@app.route('/api/generate', methods=['POST'])
@token_required
def generate_plan(current_user):
    try:
        data = request.json
        # 创建一个副本，移除 thumbUrl 字段
        log_data = data.copy()
        if 'teaching_process_image' in log_data:
            del log_data['teaching_process_image']
        
        logger.info(f'Lesson plan generation request by user: {current_user.username}\nRequest Data: {json.dumps(log_data, ensure_ascii=False)}')
        return Response(generate_lesson_plan(data), content_type='text/plain')
    except Exception as e:
        logger.error(f'Lesson plan generation error: {str(e)}')
        return jsonify({'message': 'Generation failed'}), 500

@app.route('/api/download', methods=['POST'])
@token_required
def download_word(current_user):
    try:
        # 处理文本内容
        content = request.form.get('content', '')
        content_json = json.loads(content.replace("```json", "").replace("```", ''))
        
        # 处理上传的图片
        teaching_process_image = request.files.get('teaching_process_image')
        
        # 创建数据字典
        data = {
            'content': content
        }
        
        # 如果有上传图片，处理图片
        if teaching_process_image:
            # 生成唯一的图片文件名
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            unique_id = uuid.uuid4().hex
            image_filename = f'teaching_process_{timestamp}_{unique_id}{os.path.splitext(teaching_process_image.filename)[1]}'
            
            # 保存图片到指定目录
            upload_dir = 'uploads'
            os.makedirs(upload_dir, exist_ok=True)
            image_path = os.path.join(upload_dir, image_filename)
            teaching_process_image.save(image_path)
            
            # 将图片路径添加到数据中
            data['teaching_process_image'] = image_path
        
        # 生成Word文档
        doc = gen_word(data)
        
        # 使用时间戳和UUID生成唯一文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = uuid.uuid4().hex
        file_path = f'words/{content_json.get("授课内容", "教案")}_{timestamp}_{unique_id}.docx'
        doc.save(file_path)
        
        logger.info(f'Word document generated by user: {current_user.username}, File: {file_path}')
        
        # 返回文件
        return send_file(file_path, as_attachment=True)
    
    except Exception as e:
        logger.error(f'Word document generation error: {str(e)}')
        return jsonify({'message': 'Document generation failed'}), 500

if __name__ == '__main__':
    logger.info('Starting Flask application')
    app.run(debug=True)