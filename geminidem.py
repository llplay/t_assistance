# To run this code you need to install the following dependencies:
# pip install google-genai

import os
from google import genai
from google.genai import types


def generate():
    client = genai.Client(
        api_key=os.environ.get("GEMINI_API_KEY"),
    )

    model = "gemini-3-flash-preview"
    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text="""我想减肥 爬楼梯这个可取吗"""),
            ],
        ),
        types.Content(
            role="model",
            parts=[
                types.Part.from_text(text="""**Analyzing Stair Climbing Benefits**

I'm initially focusing on the weight loss potential of stair climbing. My research began with calorie burn comparisons, looking at hourly or per-floor figures. I'm actively comparing this data with other standard exercises, like running and walking, to establish a benchmark for efficiency.


**Analyzing Stair Climbing Benefits**

I've just completed the initial research phase. I've compiled a comprehensive overview of stair climbing's effectiveness and the key factors to consider for weight loss. The results are promising. I'm focusing on the specifics of how stair climbing compares to other forms of exercise.


**Evaluating Stair Climbing Drawbacks**

I've been drilling down into the potential downsides. I'm taking a hard look at the joint impact, especially during descent, and weighing this against the benefits. I'm also assessing the risks of overtraining, and exploring the suitability, or lack thereof, for different individuals. I have made notes for the user on specific techniques and methods for mitigations.


**Refining Safety Guidelines**

I'm now integrating safety protocols and personalized guidelines. I'm structuring a tailored approach that accounts for varying fitness levels. I am making it concise and practical. I'm focusing on duration, frequency, and heart rate targets, and will incorporate specific \"who should avoid\" criteria. I am addressing the \"fasted\" climbing trend with balanced viewpoints. I am comparing home-based climbing to gym equipment.


"""),
                types.Part.from_text(text="""爬楼梯减肥是**非常可取且高效**的。它的燃脂效率远高于快走，甚至在单位时间内比慢跑更消耗热量。

不过，爬楼梯是一把“双刃剑”。如果方法不对，会对膝盖造成较大压力。以下是详细的分析和建议：

### 1. 爬楼梯减肥的“效率优势”
*   **高热量消耗**：爬楼梯属于“垂直运动”，需要对抗重力。研究显示，爬楼梯消耗的热量是**快走的3倍**，**慢跑的1.5倍**左右。
*   **塑形效果好**：它能深度动员**臀大肌、大腿股四头肌和核心肌群**。长期坚持，不仅能瘦，还能让臀部线条更紧致，改善久坐导致的“假胯宽”。
*   **心肺锻炼**：爬楼梯能迅速提升心率，属于典型的心肺强化训练，有助于提高基础代谢。

### 2. 爬楼梯 vs. 膝盖（关键避坑指南）
很多人担心爬楼梯伤膝盖，这确实有依据。上楼时膝盖承受的压力约是体重的3-4倍，而**下楼时高达6-8倍**。
**✅ 核心建议：只爬上，不走下。**
*   **利用电梯**：最理想的减肥方案是**爬楼梯上楼，坐电梯下楼**。这样既保证了运动强度，又把对关节的冲击降到了最低。

### 3. 正确的爬楼梯姿势（不累膝盖，更瘦腿）
*   **全脚掌着地**：上台阶时，不要只用前脚掌踩，要尽量让**全脚掌着地**（或至少脚跟要吃劲），这样能带动臀部发力，减轻小腿压力。
*   **身体微前倾**：背部挺直，身体微微前倾，把发力点集中在**臀部和后胯**，而不是膝盖。
*   **不要内扣或外翻**：膝盖要正对脚尖方向，避免左右晃动磨损髌骨。

### 4. 谁不适合爬楼梯？
虽然爬楼梯效果好，但以下人群建议换成**平地快走**或**游泳**：
*   **BMI（体重指数）超过28的超重人群**（体重基数过大，对关节压迫太大）。
*   **已有膝关节受损、退行性关节炎或下肢力线不正（严重X/O型腿）**的人。
*   **心血管疾病患者**（爬楼梯心率提升极快，易产生风险）。

### 5. 建议的训练计划
*   **新手期**：每次爬10-15分钟（大约20-30层楼），每周3-4次。
*   **进阶期**：尝试“间歇爬楼法”。快爬2层，慢走1层休息，循环20-30分钟。
*   **注意**：运动前一定要活动踝关节和膝关节；运动后必须拉伸小腿（腓肠肌），防止肌肉结块导致“萝卜腿”。

**总结建议：**
如果你体重基数不算极大，且膝盖没有旧伤，爬楼梯是**“性价比最高”**的减肥运动之一。记得**“只上不下”**，配合清淡饮食，通常一个月就能看到明显的围度变化。"""),
            ],
        ),
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text="""INSERT_INPUT_HERE"""),
            ],
        ),
    ]
    tools = [
        types.Tool(googleSearch=types.GoogleSearch(
        )),
    ]
    generate_content_config = types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(
            thinking_level="HIGH",
        ),
        tools=tools,
    )

    for chunk in client.models.generate_content_stream(
        model=model,
        contents=contents,
        config=generate_content_config,
    ):
        print(chunk.text, end="")

if __name__ == "__main__":
    generate()


