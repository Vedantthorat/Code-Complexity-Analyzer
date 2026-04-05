from radon.complexity import cc_visit
from radon.metrics import mi_visit
import ast
import re


def analyze_code(code: str, filename: str = "unnamed.py"):
    code = code.replace('\r', '').strip()

    if not code:
        return {
            "error": "Empty code",
            "filename": filename,
            "metrics": {},
            "functions": []
        }

    try:
        # Validate syntax
        try:
            ast.parse(code)
        except:
            return {
                "error": "Invalid Python syntax",
                "filename": filename,
                "metrics": {},
                "functions": []
            }

        complexity_results = cc_visit(code)

        try:
            maintainability = mi_visit(code, multi=False)
        except:
            maintainability = 0

        total_loc = len(code.splitlines())

        functions = []
        total_complexity = 0

        for func in complexity_results:
            length = _get_function_length(code, func.lineno)

            functions.append({
                "name": func.name,
                "complexity": func.complexity,
                "lineno": func.lineno,
                "length_lines": length,
                "rating": _get_complexity_rating(func.complexity)
            })

            total_complexity += func.complexity

        avg_complexity = round(total_complexity / len(functions), 2) if functions else 0

        return {
            "filename": filename,
            "metrics": {
                "loc": total_loc,
                "functions_count": len(functions),
                "avg_complexity": avg_complexity,
                "maintainability_index": round(maintainability, 2)
            },
            "functions": functions
        }

    except Exception as e:
        return {
            "error": str(e),
            "filename": filename,
            "metrics": {},
            "functions": []
        }


# =========================
# 🔹 Helpers
# =========================
def _get_function_length(code, start_line):
    lines = code.splitlines()

    for i in range(start_line, len(lines)):
        if re.match(r'^\s*(def |class )', lines[i]):
            return i - start_line

    return len(lines) - start_line + 1


def _get_complexity_rating(c):
    if c > 15:
        return "🔴 High"
    elif c > 7:
        return "🟡 Medium"
    return "🟢 Low"