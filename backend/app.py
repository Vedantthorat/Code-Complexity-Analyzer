from flask import Flask, request, jsonify
from flask_cors import CORS
import os

# 🔹 Services

from services.code_analyzer import analyze_code
from services.github_service import analyze_github_repo
from services.insights_engine import generate_insights
from services.ai_service import analyze_with_ai

app = Flask(**name**)

# 🔐 CORS (allow all for deployment)

CORS(app)

# =========================

# ✅ HEALTH CHECK

# =========================

@app.route('/')
def home():
return "✅ Advanced Code Complexity Analyzer is running!"

# =========================

# 🤖 AI ANALYSIS

# =========================

@app.route("/ai-analyze", methods=["POST"])
def ai_analyze():
try:
data = request.get_json()
code = data.get("code", "")

```
    if not code.strip():  
        return jsonify({"error": "No code provided"}), 400  

    result = analyze_with_ai(code)  

    return jsonify({"ai_analysis": result})  

except Exception as e:  
    return jsonify({"error": str(e)}), 500  
```

# =========================

# 📄 SINGLE FILE

# =========================

@app.route('/analyze', methods=['POST'])
def analyze_code_route():
try:
data = request.get_json()
code = data.get('code', '')

```
    result = analyze_code(code)  

    # Add insights  
    result["insights"] = generate_insights(result)  

    return jsonify(result)  

except Exception as e:  
    return jsonify({"error": str(e)}), 500  
```

# =========================

# 📁 MULTI FILE

# =========================

@app.route('/analyze-multi', methods=['POST'])
def analyze_multi():
try:
data = request.get_json()
files = data.get('files', [])

```
    if not files:  
        return jsonify({"error": "No files provided"}), 400  

    results = []  

    for f in files:  
        code = f.get("code", "")  
        name = f.get("name", "unnamed.py")  

        analysis = analyze_code(code, name)  
        results.append(analysis)  

    return jsonify({  
        "files": results,  
        "functions": [  
            func  
            for file in results if "functions" in file  
            for func in file["functions"]  
        ],  
        "insights": generate_insights({"files": results})  
    })  

except Exception as e:  
    return jsonify({"error": str(e)}), 500  
```

# =========================

# 🌐 GITHUB

# =========================

@app.route('/analyze-repo', methods=['POST'])
def analyze_repo():
try:
data = request.get_json()
repo_url = data.get('repo_url', '')

```
    if not repo_url:  
        return jsonify({"error": "repo_url is required"}), 400  

    result = analyze_github_repo(repo_url)  

    if "error" not in result:  
        result["insights"] = generate_insights(result)  

    return jsonify(result)  

except Exception as e:  
    return jsonify({"error": str(e)}), 500  
```

# =========================

# 🚀 RUN (FIXED FOR DEPLOYMENT)

# =========================

if **name** == "**main**":
port = int(os.environ.get("PORT", 5000))
app.run(host="0.0.0.0", port=port)
