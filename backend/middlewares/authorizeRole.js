export const authorizeRole = (allowedRoles = []) => (req, res, next) => {
  const role = req.user?.role;
  if (!role) return res.status(403).json({ success: false, message: 'Missing role' });
  if (!allowedRoles.includes(role)) return res.status(403).json({ success: false, message: 'Insufficient role' });
  next();
};
