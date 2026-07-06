UPDATE courses SET price = 4.99
WHERE is_active = true
  AND slug NOT IN ('posicionamiento', 'clase-complementaria');
