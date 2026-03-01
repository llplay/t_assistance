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
from gen import generate_lesson_plan, gen_word, generate_teaching_schedule, gen_schedule_word
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
    textbooks = db.relationship('Textbook', backref='owner', lazy=True)

class Textbook(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    toc_content = db.Column(db.JSON, nullable=True) # 存储结构化的目录 JSON
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class TeachingSchedule(db.Model):
    """授课计划记录（存储 AI 生成的 JSON 原文及元信息）"""
    id = db.Column(db.Integer, primary_key=True)
    course_name = db.Column(db.String(200), nullable=False)
    semester = db.Column(db.String(100), nullable=False)
    content_json = db.Column(db.Text, nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    lesson_plans = db.relationship('LessonPlan', backref='schedule', lazy=True, cascade="all, delete-orphan")

class LessonPlan(db.Model):
    """单节课的教案记录（隶属于某个授课计划）"""
    id = db.Column(db.Integer, primary_key=True)
    schedule_id = db.Column(db.Integer, db.ForeignKey('teaching_schedule.id'), nullable=False)
    section_name = db.Column(db.String(200), nullable=False) # e.g., "第1周 第1-2节: OpenCV简介"
    section_index = db.Column(db.Integer, nullable=False) # 用于定位是授课计划中的哪一条
    content_json = db.Column(db.Text, nullable=True) # 生成的教案 JSON
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# 创建数据库表
with app.app_context():
    db.create_all()

# Secure password hashing with salt (仅保留为参考，实际使用 Werkzeug 的方法)
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
        # 移除 method='sha256'
        hashed_password = generate_password_hash(data['password'])
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
            # 移除 method='sha256'
            current_user.password = generate_password_hash(data['new_password'])
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
        headers = {
            'X-Accel-Buffering': 'no',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
        return Response(generate_lesson_plan(data), content_type='text/plain', headers=headers)
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
        else:
            data['teaching_process_image'] = "教学流程.png"
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
@app.route('/api/textbooks/extract-toc', methods=['POST'])
@token_required
def extract_toc(current_user):
    try:
        data = request.json
        raw_text = data.get('text', '')
        if not raw_text:
            return jsonify({'message': 'Text is required'}), 400
        
        from gen import extract_toc_structure
        toc_json = extract_toc_structure(raw_text)
        return jsonify(toc_json)
    except Exception as e:
        logger.error(f'TOC extraction error: {str(e)}')
        return jsonify({'message': 'Extraction failed'}), 500

@app.route('/api/textbooks', methods=['POST'])
@token_required
def save_textbook(current_user):
    try:
        data = request.json
        name = data.get('name')
        toc_content = data.get('toc_content')
        
        if not name or not toc_content:
            return jsonify({'message': 'Name and TOC content are required'}), 400
            
        new_textbook = Textbook(name=name, toc_content=toc_content, user_id=current_user.id)
        db.session.add(new_textbook)
        db.session.commit()
        
        logger.info(f'Textbook saved: {name} by user {current_user.username}')
        return jsonify({'message': 'Textbook saved successfully', 'id': new_textbook.id}), 201
    except Exception as e:
        logger.error(f'Save textbook error: {str(e)}')
        return jsonify({'message': 'Save failed'}), 500

@app.route('/api/textbooks', methods=['GET'])
@token_required
def get_textbooks(current_user):
    try:
        textbooks = Textbook.query.filter_by(user_id=current_user.id).order_by(Textbook.created_at.desc()).all()
        result = []
        for tb in textbooks:
            result.append({
                'id': tb.id,
                'name': tb.name,
                'toc_content': tb.toc_content,
                'created_at': tb.created_at.isoformat()
            })
        return jsonify(result)
    except Exception as e:
        logger.error(f'Get textbooks error: {str(e)}')
        return jsonify({'message': 'Fetch failed'}), 500

# ── 授课计划 API ─────────────────────────────────────────────

@app.route('/api/schedule/generate', methods=['POST'])
@token_required
def generate_schedule(current_user):
    """流式生成授课计划 JSON"""
    try:
        data = request.json
        logger.info(f'Schedule generation by user: {current_user.username}, course: {data.get("课程名称","")}')
        headers = {
            'X-Accel-Buffering': 'no',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
        return Response(generate_teaching_schedule(data), content_type='text/plain', headers=headers)
    except Exception as e:
        logger.error(f'Schedule generation error: {str(e)}')
        return jsonify({'message': 'Generation failed'}), 500


@app.route('/api/schedule/download', methods=['POST'])
@token_required
def download_schedule_word(current_user):
    """根据授课计划 JSON 生成并下载 Word 文件"""
    try:
        data = request.json
        content_raw = data.get('content', '')
        content_clean = content_raw.replace('```json', '').replace('```', '').strip()
        schedule_json = json.loads(content_clean, strict=False)

        course_name = schedule_json.get('课程名称', '授课计划')
        semester = schedule_json.get('学年学期', '')

        # 保存记录到数据库
        new_record = TeachingSchedule(
            course_name=course_name,
            semester=semester,
            content_json=content_clean,
            user_id=current_user.id
        )
        db.session.add(new_record)
        db.session.commit()

        # 生成 Word
        doc = gen_schedule_word(schedule_json)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = uuid.uuid4().hex[:8]
        os.makedirs('words', exist_ok=True)
        file_path = f'words/授课计划_{course_name}_{timestamp}_{unique_id}.docx'
        doc.save(file_path)

        logger.info(f'Schedule Word generated by user: {current_user.username}, file: {file_path}')
        return send_file(file_path, as_attachment=True,
                         download_name=f'授课计划_{course_name}_{semester}.docx')
    except Exception as e:
        logger.error(f'Schedule download error: {str(e)}')
        return jsonify({'message': f'Download failed: {str(e)}'}), 500


@app.route('/api/schedules', methods=['GET'])
@token_required
def get_schedules(current_user):
    """获取当前用户的历史授课计划列表"""
    try:
        schedules = TeachingSchedule.query.filter_by(user_id=current_user.id)\
            .order_by(TeachingSchedule.created_at.desc()).all()
        result = [{
            'id': s.id,
            'course_name': s.course_name,
            'semester': s.semester,
            'created_at': s.created_at.isoformat()
        } for s in schedules]
        return jsonify(result)
    except Exception as e:
        logger.error(f'Get schedules error: {str(e)}')
        return jsonify({'message': 'Fetch failed'}), 500

@app.route('/api/schedules/<int:schedule_id>', methods=['GET'])
@token_required
def get_schedule_by_id(current_user, schedule_id):
    """获取单个授课计划详情"""
    try:
        schedule = TeachingSchedule.query.filter_by(id=schedule_id, user_id=current_user.id).first()
        if not schedule:
            return jsonify({'message': 'Not found'}), 404
        return jsonify({
            'id': schedule.id,
            'course_name': schedule.course_name,
            'semester': schedule.semester,
            'content_json': schedule.content_json,
            'created_at': schedule.created_at.isoformat()
        })
    except Exception as e:
        logger.error(f'Get schedule by id error: {str(e)}')
        return jsonify({'message': 'Fetch failed'}), 500

@app.route('/api/schedules/<int:schedule_id>', methods=['DELETE'])
@token_required
def delete_schedule(current_user, schedule_id):
    """删除授课计划及其所有的教案"""
    try:
        schedule = TeachingSchedule.query.filter_by(id=schedule_id, user_id=current_user.id).first()
        if not schedule:
            return jsonify({'message': 'Not found or unauthorized'}), 404
            
        db.session.delete(schedule)
        db.session.commit()
        return jsonify({'message': 'Successfully deleted'})
    except Exception as e:
        logger.error(f'Delete schedule error: {str(e)}')
        return jsonify({'message': 'Delete failed'}), 500


@app.route('/api/schedules/save', methods=['POST'])
@token_required
def save_schedule(current_user):
    """保存生成的授课计划"""
    try:
        data = request.json
        content_clean = data.get('content_json', '')
        schedule_json = json.loads(content_clean, strict=False)
        course_name = schedule_json.get('课程名称', '授课计划')
        semester = schedule_json.get('学年学期', '')
        
        new_record = TeachingSchedule(
            course_name=course_name,
            semester=semester,
            content_json=content_clean,
            user_id=current_user.id
        )
        db.session.add(new_record)
        db.session.commit()
        return jsonify({'message': 'Schedule saved successfully', 'id': new_record.id}), 201
    except Exception as e:
        logger.error(f'Save schedule error: {str(e)}')
        return jsonify({'message': 'Save failed'}), 500

@app.route('/api/schedules/<int:schedule_id>/lessons', methods=['GET'])
@token_required
def get_schedule_lessons(current_user, schedule_id):
    """获取某个授课计划下的所有教案"""
    try:
        lessons = LessonPlan.query.filter_by(schedule_id=schedule_id, user_id=current_user.id).all()
        result = [{
            'id': l.id,
            'section_index': l.section_index,
            'section_name': l.section_name,
            'content_json': l.content_json,
            'created_at': l.created_at.isoformat()
        } for l in lessons]
        return jsonify(result)
    except Exception as e:
        logger.error(f'Get lessons error: {str(e)}')
        return jsonify({'message': 'Fetch failed'}), 500

@app.route('/api/lessons/save', methods=['POST'])
@token_required
def save_lesson_plan(current_user):
    """保存或更新单节课的教案"""
    try:
        data = request.json
        schedule_id = data.get('schedule_id')
        section_index = data.get('section_index')
        section_name = data.get('section_name')
        content_json = data.get('content_json')
        
        lesson = LessonPlan.query.filter_by(schedule_id=schedule_id, section_index=section_index, user_id=current_user.id).first()
        if lesson:
            lesson.content_json = content_json
            lesson.section_name = section_name
        else:
            lesson = LessonPlan(
                schedule_id=schedule_id,
                section_index=section_index,
                section_name=section_name,
                content_json=content_json,
                user_id=current_user.id
            )
            db.session.add(lesson)
        
        db.session.commit()
        return jsonify({'message': 'Lesson plan saved', 'id': lesson.id}), 201
    except Exception as e:
        logger.error(f'Save lesson error: {str(e)}')
        return jsonify({'message': 'Save failed'}), 500

@app.route('/api/lessons/generate_stream', methods=['POST'])
@token_required
def generate_lesson_stream(current_user):
    """流式生成对应章节的教案"""
    try:
        data = request.json
        logger.info(f'Lesson plan generation stream by user: {current_user.username}')
        headers = {
            'X-Accel-Buffering': 'no',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
        from gen import generate_lesson_plan_for_schedule
        return Response(generate_lesson_plan_for_schedule(data), content_type='text/plain', headers=headers)
    except Exception as e:
        logger.error(f'Lesson generation stream error: {str(e)}')
        return jsonify({'message': 'Generation failed'}), 500
if __name__ == '__main__':
    logger.info('Starting Flask application')
    app.run(debug=True, host='0.0.0.0')
