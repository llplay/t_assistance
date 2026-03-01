import docx

doc = docx.Document('schedule_template.docx')
p = doc.paragraphs[4]
with open('run_xml.txt', 'w', encoding='utf-8') as f:
    for i, r in enumerate(p.runs): 
        f.write(f"--- Run {i} ---\n")
        f.write(r._element.xml + '\n')
