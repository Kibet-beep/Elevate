import math
from PIL import Image, ImageDraw

# Create 1024x1024 black canvas
size = 1024
img = Image.new('RGB', (size, size), 'black')
draw = ImageDraw.Draw(img)

# Center point
cx, cy = size / 2, size / 2

# Draw 3 fan blades
leaf_count = 3
blade_radius = 220
blade_width = 90

for i in range(leaf_count):
    angle = (360 / leaf_count * i - 90) * math.pi / 180
    
    # Calculate blade points (trapezoid shape)
    p1_x = cx + (blade_width / 2) * math.cos(angle + math.pi / 2)
    p1_y = cy + (blade_width / 2) * math.sin(angle + math.pi / 2)
    
    p2_x = cx - (blade_width / 2) * math.cos(angle + math.pi / 2)
    p2_y = cy - (blade_width / 2) * math.sin(angle + math.pi / 2)
    
    p3_x = cx + blade_radius * math.cos(angle)
    p3_y = cy + blade_radius * math.sin(angle)
    
    # Draw blade triangle
    draw.polygon([(p1_x, p1_y), (p2_x, p2_y), (p3_x, p3_y)], fill='white')

# Draw center circle
center_r = 45
draw.ellipse([cx - center_r, cy - center_r, cx + center_r, cy + center_r], fill='white')

img.save('assets/icon.png')
print('Created icon.png with white fan design on black background')
