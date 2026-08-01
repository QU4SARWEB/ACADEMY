UPDATE courses SET price = 15
WHERE is_active = true
  AND slug NOT IN ('posicionamiento', 'clase-general', 'clase-complementaria');
