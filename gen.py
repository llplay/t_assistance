from flask import Flask, request, Response, send_file
from flask_cors import CORS
import json
from docx import Document
import time
import os
import uuid
from datetime import datetime
from zhipuai import ZhipuAI
import json
from docx import Document
from docx.oxml.ns import qn
from docx.shared import Pt, Inches
from docx.enum.text import WD_PARAGRAPH_ALIGNMENT

def gen_word(gen_data):
    teaching_process_image = gen_data.get('teaching_process_image')
    gen_data = json.loads(gen_data["content"].replace("```json", "").replace("```", ''))
    # 读取教案模板
    doc = Document('教案模板.docx')
    # 遍历文档中的所有表格
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                # 找到包含“##”的单元格
                if "##" in cell.text:
                    # 按照"##节点1##节点2##"的格式提取gen.json中的内容
                    keys = cell.text.split("##")  # 获取双井号之间的键
                    if "教学流程" in cell.text:
                        # 清空单元格原有内容
                        cell.text = ''
                        # 插入图片（假设图片在同一目录下）
                        image_path = teaching_process_image  # 替换为你的图片路径
                        if os.path.exists(image_path):
                            # 在文字描述后插入图片
                            picture = cell.add_paragraph()
                            run = picture.add_run()
                            run.add_picture(image_path, width=Inches(5))  # 设置图片宽度为5英寸
                            picture.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER  # 图片居中
                    try:
                        # 根据提取的键逐层从gen.json中获取值
                        value = gen_data
                        for key in keys:
                            if key.strip() == '':
                                continue
                            # print(key)
                            value = value[key]
                        # 替换单元格内容
                        cell.text = value
                    except KeyError:
                        # 若gen.json中没有相应的键，则保持原内容不变
                        pass
                # 设置单元格字体为宋体、小四号
                for paragraph in cell.paragraphs:
                    for run in paragraph.runs:
                        run.font.name = '宋体'
                        run._element.rPr.rFonts.set(qn('w:eastAsia'), '宋体')  # 设置中文字体
                        run.font.size = Pt(12)  # 设置小四号字体（12磅）
    # 保存填充后的教案
    return doc


client = ZhipuAI(api_key="638ed826ac771a6612ca4acb28c8d79c.9iVxuMj2agHUUiIG")


def generate_lesson_plan(data):
    subject = data["subject"]
    grade = data["grade"]
    _class = data["class"]
    students = data["students"]
    content = data["content"]
    duration = data["duration"]
    location = data["location"]
    time = data["time"]
    method = data["method"]
    teaching_process = "\n".join(data["teaching_process"])
    book_name = data["book_name"]
    example = '''
    这是以个opencv摄像头拍摄图像及视频教案json的示例
    {
    "专业名称":"计算机技术",
    "授课年级":"大二",
    "授课班级":"二班",
    "授课对象":"大专",
    "授课学时":"2",
    "授课地点":"机房",
    "授课时间":"9.8",
    "授课方式":"理实一体化",
    "教材": "",
      "授课内容": "摄像头拍摄图像及视频"
      "教学内容": "用摄像头拍摄图像及视频,本地视频的读取与播放,学习如何使用OpenCV的VideoCapture类，捕获摄像头的实时图像与视频。通过OpenCV库读取并逐帧播放本地存储的视频文件，理解视频处理流程。",
      "学情分析": {
        "知识和技能基础": "学生已经学习了Python基础语法和OpenCV的基本图像处理操作。学生对电脑摄像头有基本操作经验，了解摄像头的使用。",
        "认知和实践能力": "学生具备较强的编程理解能力，但对实时视频捕获及处理的知识还较为薄弱。学生动手能力较强，适合通过任务驱动和项目实践提升技能。",
        "学习特点": "学生动手能力强，善于通过实践操作来加深对概念的理解。学生之间具备合作学习的基础，喜欢通过讨论解决编程问题。"
      },
      "教学目标": {
        "素质目标": "培养学生的团队合作精神和自主学习能力。",
        "知识目标": "掌握摄像头图像和视频捕获的基本操作，学会读取和播放本地视频文件。",
        "能力目标": "能够使用OpenCV独立实现摄像头图像和视频捕获及本地视频播放功能。"
      },
      "教学重点": "摄像头实时图像与视频的捕获操作及本地视频的逐帧读取与播放。",
      "教学难点": "视频播放的流畅性及摄像头图像捕获的稳定性。",
      "教学方法": {
        "教法": "采用任务驱动教学法，结合课堂讲解、案例演示和实操练习。",
        "学法": "学生通过自主探究与小组合作进行编程实践，完成摄像头与视频处理任务。"
      },
      "教学过程": {
        "课前": {
          "教学环节": "课前准备",
          "教学内容": "分发学习材料",
          "教师活动": "在学习通平台上传摄像头与视频处理相关的学习材料，提供相关示例代码和操作步骤。",
          "学生活动": "学生提前预习材料，熟悉课程内容，了解摄像头与视频处理的基础知识。",
          "设计意图": "通过课前预习，帮助学生了解课程重点，提前做好准备，为课堂上的实际操作打下基础。"
        },
        "课中": {
          "明确任务": {
            "教学内容": "介绍课程任务和目标",
            "教师活动": "向学生讲解本节课的任务及目标，明确学习方向。任务包括：使用摄像头捕获图像与视频，并读取和播放本地视频。",
            "学生活动": "学生听讲并记录任务要点，明确学习目标。",
            "设计意图": "确保学生对本节课的内容有清晰的认识，能够明确自己在课堂上的任务和目标，激发学生的学习动机。"
          },
          "分析任务": {
            "教学内容": "摄像头图像与视频捕获操作",
            "教师活动": "详细讲解如何使用OpenCV的VideoCapture类来捕获摄像头的图像和视频，并现场演示代码实现的过程，解释每一步的功能和用途。",
            "学生活动": "学生听讲并做笔记，理解摄像头操作的基本流程，积极参与课堂互动，提出问题或讨论解决方法。",
            "设计意图": "通过详细讲解和现场演示，帮助学生掌握摄像头图像和视频捕获的核心技术，理解每个步骤的操作原理，为接下来的编程实践做好准备。"
          },
          "探究新知": {
            "教学内容": "视频读取与播放",
            "教师活动": "演示如何使用OpenCV读取和播放本地视频，并逐行解释代码，重点讲解视频帧的读取、显示、暂停和停止等操作。",
            "学生活动": "学生独立操作，按照教师的指导完成代码实现，尝试修改代码以实现不同的视频播放效果。",
            "设计意图": "通过演示和实际操作，帮助学生加深对视频处理的理解，培养他们独立解决问题的能力，增强课堂的互动性和参与感。"
          },
          "训练技能": {
            "教学内容": "编程实践",
            "教师活动": "布置编程实践任务，要求学生独立完成摄像头与视频处理的实际编程任务。教师在此过程中进行指导，帮助学生解决遇到的问题，并提供优化建议。",
            "学生活动": "学生独立编程，完成任务，并通过小组讨论和合作交流解决问题，共同探讨优化代码的方案。",
            "设计意图": "通过实践练习，提升学生的动手能力和解决问题的能力，同时通过合作学习，培养学生的团队合作精神和相互学习的习惯。"
          },
          "评价总结": {
            "教学内容": "课堂总结与提问",
            "教师活动": "回顾本节课的知识点，特别是摄像头与视频处理的关键操作，提问学生，检验其理解程度，并给予反馈和指导。",
            "学生活动": "学生总结课程内容，回答教师提问，主动提出自己在学习过程中遇到的难点，寻求帮助。",
            "设计意图": "通过总结和反馈帮助学生巩固知识，解决疑惑，确保每个学生都能掌握本节课的核心内容。"
          }
        },
        "课后": {
          "教学环节": "课后复习",
          "教学内容": "复习与拓展练习",
          "教师活动": "布置课后作业，要求学生完成额外的视频处理任务，如实现视频的基本编辑功能，并提供相关参考资料。",
          "学生活动": "学生完成课后练习，复习课堂所学，进一步巩固知识，并尝试独立完成拓展任务。",
          "设计意图": "通过课后作业，帮助学生在课后进一步巩固和拓展知识，强化编程实践能力，培养自主学习的习惯。"
        }
      },
      "教学评价": {
        "评价标准": "根据学生在课堂上的任务完成度、代码的正确性和优化程度以及课堂表现进行综合评估。特别关注学生独立解决问题的能力和团队合作的情况。"
      },
      "教学反思": {
        "教学效果": "大部分学生能够独立完成摄像头和视频的编程任务，且对实际应用产生浓厚兴趣，课堂互动良好，教学目标基本达成。",
        "特色创新": "结合实际应用场景，将视频处理与实时图像处理结合进行教学，并通过实际案例提升学生的学习兴趣和动手能力。",
        "不足": "部分学生在视频播放流畅性上遇到问题，缺乏优化代码的能力，对性能调优和异常处理的理解较为薄弱。",
        "改进措施": "后续课程中将加强对性能优化和异常处理的讲解，增加更多的实际案例和优化练习，帮助学生提升视频处理的代码质量和稳定性。同时，通过小组讨论和案例分析的方式，进一步培养学生的团队合作和解决问题的能力。"
      }
    }
    '''
    
    
    prompt = f'''
    我是一名高职教师，我的授课对象是{grade}{_class}{duration}{students}高职学生,上课地点是{location},上课时间是{time},
    授课方式是{method}，教材是{book_name}
    请帮我按照以下要求撰写一下教案
    这节课的主要内容有：{content}
    教案目录：
    1.教学内容
    2.学情分析
    2.1知识和技能基础
    2.2认知和实践能力
    2.3学习特点
    3.教学目标
    3.1素质目标
    3.2知识目标
    3.3能力目标
    4.教学重点
    5.教学难点
    6.教学方法
    6.1教法
    6.2学法
    8.教学过程
    8.1课前
    8.2课中
    8.3课后
    9.教学评价
    10.教学反思
    10.1教学效果
    10.2特色创新
    10.3不足
    10.4改进措施
    其中课前课后包含以下四部分内容
    教学环节
    教学内容
    教师活动
    学生活动
    设计意图
    其中课中分为以下几个部分
    {teaching_process}
    课中的每一部分也都包含教学环节、教学内容、教师活动、学生活动、设计意图
    以json的形式返回给我
    {example}
    要求内容尽可能的详细，字数要足够多， 不能少于2000字
    '''
    response = client.chat.completions.create(
        model="glm-4-flash",  # 请填写您要调用的模型名称
        max_tokens="4095",
        messages=[
            {"role": "user", "content": prompt},
        ],
        stream=True
    )
    for chunk in response:
        yield chunk.choices[0].delta.content


