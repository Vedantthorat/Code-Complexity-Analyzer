# backend/services/insights_engine.py

def generate_insights(analysis_result):
    insights = []

    # Handle single OR multi OR repo
    files = analysis_result.get("files", [analysis_result])

    high_complex_count = 0
    long_func_count = 0

    for file in files:
        if "error" in file:
            continue

        filename = file.get("filename", "Code")

        for func in file.get("functions", []):
            complexity = func.get("complexity", 0)
            length = func.get("length_lines", 0)

            # 🔴 High complexity
            if complexity > 15:
                insights.append(
                    f"🔴 {filename} → {func['name']} is too complex ({complexity})"
                )
                high_complex_count += 1

            # 📏 Long function
            if length > 50:
                insights.append(
                    f"📏 {filename} → {func['name']} is too long ({length} lines)"
                )
                long_func_count += 1

    # =========================
    # 🔥 Summary Insights
    # =========================
    if high_complex_count > 0:
        insights.append(f"⚠️ {high_complex_count} highly complex function(s) found")

    if long_func_count > 0:
        insights.append(f"⚠️ {long_func_count} long function(s) detected")

    # Default message
    if not insights:
        return ["✅ Code looks clean and well-structured!"]

    return insights