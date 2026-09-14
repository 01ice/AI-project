# -*- coding: utf-8 -*-
"""
小程序工程静态自检：
1) 所有 .json 可解析
2) 所有 .js 可被 node --check 通过
3) WXML 标签闭合 / 双花括号配对
4) app.json 中每个页面四件套齐全（除 tabBar 图标）
5) tabBar 图标文件存在
6) 约定检查：WXML 插值内不得出现函数调用
"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NODE = r"C:\Users\chen\.workbuddy\binaries\node\versions\22.22.2-3\node.exe"

errors = []
warnings = []


def rel(p):
    return os.path.relpath(p, ROOT)


def walk(ext):
    out = []
    for base, dirs, files in os.walk(ROOT):
        if "node_modules" in base or ".git" in base:
            continue
        for f in files:
            if f.endswith(ext):
                out.append(os.path.join(base, f))
    return out


# ---------- 1. JSON ----------
app_json = None
for p in walk(".json"):
    try:
        with open(p, "r", encoding="utf-8") as fp:
            data = json.load(fp)
        if os.path.basename(p) == "app.json":
            app_json = data
    except Exception as e:
        errors.append("JSON 解析失败 %s: %s" % (rel(p), e))

# ---------- 2. JS ----------
for p in walk(".js"):
    r = subprocess.run([NODE, "--check", p], capture_output=True, text=True)
    if r.returncode != 0:
        errors.append("JS 语法错误 %s:\n%s" % (rel(p), r.stderr.strip()))

# ---------- 3. WXML ----------
VOID = set()
TAG_RE = re.compile(r"<!--.*?-->|<(/?)([a-zA-Z][\w-]*)([^>]*?)(/?)>", re.S)


def check_wxml(path):
    with open(path, "r", encoding="utf-8") as fp:
        text = fp.read()

    # 去掉注释后再做标签配对
    clean = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    # 把 {{...}} 整体替换成无尖括号的占位符，避免表达式里的 > < 干扰标签解析
    structural = re.sub(r"\{\{.*?\}\}", "EXPR", clean, flags=re.S)
    stack = []
    for m in TAG_RE.finditer(structural):
        whole = m.group(0)
        if whole.startswith("<!--"):
            continue
        closing, name, attrs, self_close = m.group(1), m.group(2), m.group(3), m.group(4)
        if closing:
            if not stack:
                errors.append("%s: 多余的结束标签 </%s>" % (rel(path), name))
                continue
            top = stack.pop()
            if top != name:
                errors.append("%s: 标签未闭合，期望 </%s> 实际 </%s>" % (rel(path), top, name))
        elif self_close:
            continue
        else:
            stack.append(name)
    if stack:
        errors.append("%s: 存在未闭合标签 %s" % (rel(path), stack))

    # 花括号配对
    if text.count("{{") != text.count("}}"):
        errors.append("%s: 双花括号不配对 {{=%d }}=%d"
                      % (rel(path), text.count("{{"), text.count("}}")))

    # 属性重复（同名）
    for m in TAG_RE.finditer(structural):
        if m.group(0).startswith("<!--") or m.group(1):
            continue
        attrs = m.group(3)
        names = re.findall(r"([\w:-]+)\s*=", attrs)
        dup = set(n for n in names if names.count(n) > 1)
        if dup:
            errors.append("%s: 标签 <%s> 重复属性 %s" % (rel(path), m.group(2), dup))

    # 约定：插值内不得出现函数调用
    for expr in re.findall(r"\{\{(.*?)\}\}", text, re.S):
        e = expr
        e = re.sub(r"'[^']*'", "''", e)
        e = re.sub(r'"[^"]*"', '""', e)
        if re.search(r"[\w\]\)]\s*\(", e):
            warnings.append("%s: 插值内疑似函数调用 -> {{%s}}" % (rel(path), expr.strip()))


for p in walk(".wxml"):
    check_wxml(p)

# ---------- 4. 页面四件套 ----------
if app_json:
    for page in app_json.get("pages", []):
        for ext in (".js", ".json", ".wxml", ".wxss"):
            fp = os.path.join(ROOT, page + ext)
            if not os.path.exists(fp):
                errors.append("缺少文件: %s" % (page + ext))

    # ---------- 5. tabBar 图标 ----------
    for item in app_json.get("tabBar", {}).get("list", []):
        for k in ("iconPath", "selectedIconPath"):
            fp = os.path.join(ROOT, item.get(k, ""))
            if not os.path.exists(fp):
                errors.append("缺少 tabBar 图标: %s" % item.get(k))
        if item.get("pagePath") not in app_json.get("pages", []):
            errors.append("tabBar 页面未注册: %s" % item.get("pagePath"))

    # ---------- 5b. requiredPrivateInfos 取值白名单 ----------
    # 微信只接受这 8 个地理位置接口。写错（例如 openLocation）会直接导致
    # 开发者工具报 "requiredPrivateInfos[0] 字段需为 ..." 且无法编译。
    LEGAL_PRIVATE_INFOS = {
        "chooseAddress", "chooseLocation", "choosePoi", "getFuzzyLocation",
        "getLocation", "onLocationChange", "startLocationUpdate",
        "startLocationUpdateBackground",
    }
    if "requiredPrivateInfos" in app_json:
        infos = app_json["requiredPrivateInfos"]
        if not isinstance(infos, list):
            errors.append("requiredPrivateInfos 需为数组")
        else:
            for v in infos:
                if v not in LEGAL_PRIVATE_INFOS:
                    errors.append(
                        "requiredPrivateInfos 含非法值 %r（仅支持: %s）"
                        % (v, ", ".join(sorted(LEGAL_PRIVATE_INFOS))))
            for v in infos:
                # 用了这些接口才需要声明，未使用则属多余声明
                if v in ("getLocation", "getFuzzyLocation", "chooseLocation", "choosePoi"):
                    used = False
                    for root2, _dirs, files2 in os.walk(os.path.join(ROOT, "pages")):
                        for fn in files2:
                            if fn.endswith(".js"):
                                try:
                                    with open(os.path.join(root2, fn), "r", encoding="utf-8") as f2:
                                        if v in f2.read():
                                            used = True
                                except Exception:
                                    pass
                    if not used:
                        warnings.append(
                            "requiredPrivateInfos 声明了 %s 但代码未调用（多余权限会影响审核）" % v)

    # ---------- 5c. permission.scope.userLocation 文案长度 ----------
    perm = app_json.get("permission", {}).get("scope.userLocation")
    if perm:
        desc = perm.get("desc", "")
        if not desc:
            errors.append("permission.scope.userLocation 缺少 desc")
        elif len(desc) > 30:
            errors.append("permission.scope.userLocation.desc 超长（%d 字符，上限 30）"
                          % len(desc))

# ---------- 6. 页面目录中是否存在未被引用的文件 ----------
lines = []
lines.append("=" * 60)
if errors:
    lines.append("发现 %d 个错误：" % len(errors))
    for e in errors:
        lines.append("  [ERROR] " + e)
else:
    lines.append("✓ 无错误")

if warnings:
    lines.append("")
    lines.append("%d 条提示：" % len(warnings))
    for w in warnings:
        lines.append("  [WARN] " + w)

lines.append("=" * 60)
lines.append("统计：wxml=%d, js=%d, json=%d, wxss=%d"
             % (len(walk(".wxml")), len(walk(".js")), len(walk(".json")), len(walk(".wxss"))))

report = "\n".join(lines)
with open(os.path.join(ROOT, "tools", "check-report.txt"), "w", encoding="utf-8") as fp:
    fp.write(report)
print(report.encode("utf-8", "replace").decode("utf-8", "replace"))
sys.exit(1 if errors else 0)
