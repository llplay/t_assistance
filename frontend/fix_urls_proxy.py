import os
import re

# 目录配置
src_dir = '/root/flask-react-admin/frontend/src'
config_path = os.path.join(src_dir, 'config.ts')

# 1. 生成带有 '/api_proxy' 的 config.ts
config_code = """// 动态判断基础路径
// 开发环境 (npm start): 直接请求后端真实 IP 5000 端口
// 生产环境 (npm run build): 走相对路径 /api_proxy，交由 Nginx 剥离前缀并转发给后端
export const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://47.104.217.19:5000' 
  : '/api_proxy';
"""
with open(config_path, 'w', encoding='utf-8') as f:
    f.write(config_code)
print("✅ 成功创建/更新 src/config.ts，已配置生产环境使用 '/api_proxy'")

# 2. 匹配单引号或双引号包裹的硬编码 URL
pattern = re.compile(r"['\"]http://(47\.104\.217\.19|localhost):5000(.*?)['\"]")

# 3. 遍历并修改 src 目录下所有的 .tsx 和 .ts 文件
modify_count = 0
for root, dirs, files in os.walk(src_dir):
    for filename in files:
        if not (filename.endswith('.tsx') or filename.endswith('.ts') or filename.endswith('.js') or filename.endswith('.jsx')):
            continue
        
        if filename == 'config.ts':
            continue
            
        filepath = os.path.join(root, filename)
        
        # 智能检测和读取编码 (优先 utf-8, 失败则尝试 gbk)
        content = None
        encoding_used = 'utf-8'
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            try:
                encoding_used = 'gbk'
                with open(filepath, 'r', encoding='gbk') as f:
                    content = f.read()
            except Exception as e:
                print(f"⚠️ 无法读取文件，请检查编码格式: {filepath}")
                continue
                
        # 如果找到了硬编码的 URL
        if pattern.search(content):
            new_content = pattern.sub(r"`${API_BASE_URL}\2`", content)
            
            # 自动计算相对路径
            rel_dir = os.path.relpath(src_dir, root)
            if rel_dir == '.':
                import_path = './config'
            else:
                import_path = os.path.join(rel_dir, 'config').replace('\\', '/')
                
            import_stmt = f"import {{ API_BASE_URL }} from '{import_path}';\n"
            
            # 插入 import 语句
            if "API_BASE_URL" not in content:
                new_content = import_stmt + new_content
                
            # 使用原有的编码写入，防止中文乱码
            with open(filepath, 'w', encoding=encoding_used) as f:
                f.write(new_content)
            print(f"✅ 已成功修改并替换: {filepath} (使用的编码: {encoding_used})")
            modify_count += 1

print(f"🎉 批量替换完成！本次共修复了 {modify_count} 个文件。")
