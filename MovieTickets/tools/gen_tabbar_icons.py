# -*- coding: utf-8 -*-
"""
生成 tabBar 图标（电影 / 影院 / 我的）各两套配色：未选中灰、选中橙。
输出 81x81 PNG（微信 tabBar 推荐尺寸），透明背景。
用法：python tools/gen_tabbar_icons.py
"""
import os
from PIL import Image, ImageDraw

BASE = 81          # 输出尺寸
S = 4              # 超采样倍数（先画大图再缩小，保证边缘平滑）
W = BASE * S

GRAY = (154, 154, 154, 255)
ORANGE = (255, 154, 30, 255)

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "images")


def sc(v):
    return v * S


def new_canvas():
    return Image.new("RGBA", (W, W), (0, 0, 0, 0))


def rrect(d, box, r, color, width):
    d.rounded_rectangle([sc(box[0]), sc(box[1]), sc(box[2]), sc(box[3])],
                        radius=sc(r), outline=color, width=int(sc(width)))


def line(d, xy1, xy2, color, width):
    d.line([sc(xy1[0]), sc(xy1[1]), sc(xy2[0]), sc(xy2[1])],
           fill=color, width=int(sc(width)))


def icon_movie(color):
    """电影：外框 + 分隔线 + 播放三角"""
    img = new_canvas()
    d = ImageDraw.Draw(img)
    rrect(d, (13, 19, 68, 62), 7, color, 4)
    line(d, (13, 34), (68, 34), color, 3.2)
    # 播放三角
    d.polygon([(sc(33), sc(42)), (sc(33), sc(56)), (sc(48), sc(49))], fill=color)
    return img


def icon_cinema(color):
    """影院：银幕 + 支架"""
    img = new_canvas()
    d = ImageDraw.Draw(img)
    rrect(d, (11, 18, 70, 52), 6, color, 4)
    line(d, (40.5, 52), (40.5, 61), color, 3.2)
    line(d, (27, 63), (54, 63), color, 3.6)
    return img


def icon_mine(color):
    """我的：头 + 肩"""
    img = new_canvas()
    d = ImageDraw.Draw(img)
    d.ellipse([sc(29), sc(17), sc(52), sc(40)], fill=color)
    d.chord([sc(16), sc(46), sc(65), sc(78)], 180, 360, fill=color)
    return img


def main():
    if not os.path.isdir(OUT_DIR):
        os.makedirs(OUT_DIR)
    jobs = [
        ("tab-movie.png", icon_movie, GRAY),
        ("tab-movie-on.png", icon_movie, ORANGE),
        ("tab-cinema.png", icon_cinema, GRAY),
        ("tab-cinema-on.png", icon_cinema, ORANGE),
        ("tab-mine.png", icon_mine, GRAY),
        ("tab-mine-on.png", icon_mine, ORANGE),
    ]
    for name, fn, color in jobs:
        img = fn(color).resize((BASE, BASE), Image.LANCZOS)
        path = os.path.join(OUT_DIR, name)
        img.save(path)
        print("saved", path)


if __name__ == "__main__":
    main()
