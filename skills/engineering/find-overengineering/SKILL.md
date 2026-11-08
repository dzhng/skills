---
name: find-overengineering
description: Find and roll back overengineering — protective code that solves an edge case of an edge case at the cost of far too much complexity, or careful migrations for a product with no users. Use when reviewing a diff or subsystem for unnecessary guards, fallbacks, validation, compatibility code or migrations, or when asked whether one is needed.
---

# Find Overengineering

Roll back protective code that solves an edge case of an edge case and costs far more complexity than the problem is worth, and complex migrations or backwards compatibility for a product with no users yet. Keep checks on input we don't control. Make small rollbacks right away; confirm larger ones with the user first.
