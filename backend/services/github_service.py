import requests
from services.code_analyzer import analyze_code


def analyze_github_repo(repo_url: str):
    try:
        # =========================
        # 🔹 Extract repo details
        # =========================
        parts = repo_url.replace("https://github.com/", "").split("/")
        owner = parts[0]
        repo = parts[1]

        # Handle branch
        branch = "main"
        if len(parts) > 3 and parts[2] == "tree":
            branch = parts[3]

        # =========================
        # 🔹 Get full repo tree
        # =========================
        tree_url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"
        resp = requests.get(tree_url)

        if resp.status_code != 200:
            return {"error": f"GitHub API error: {resp.status_code}"}

        tree = resp.json().get("tree", [])

        # =========================
        # 🔹 Filter Python files
        # =========================
        py_files = [
            item for item in tree
            if item["type"] == "blob" and item["path"].endswith(".py")
        ]

        results = []
        total_loc = 0
        total_funcs = 0

        # =========================
        # 🔹 Analyze each file
        # =========================
        for file in py_files:
            raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{file['path']}"
            code_resp = requests.get(raw_url)

            if code_resp.status_code == 200:
                analysis = analyze_code(code_resp.text, file["path"])

                if "metrics" in analysis:
                    total_loc += analysis["metrics"].get("loc", 0)
                    total_funcs += analysis["metrics"].get("functions_count", 0)

                results.append(analysis)

        # =========================
        # 🔹 Return structured output
        # =========================
        return {
            "project_name": f"{owner}/{repo}",
            "summary": {
                "total_files": len(results),
                "total_loc": total_loc,
                "total_functions": total_funcs,
                "files_analyzed": len(py_files)
            },
            "files": results,
            "functions": [
                func
                for file in results if "functions" in file
                for func in file["functions"]
            ]
        }

    except Exception as e:
        return {"error": str(e)}