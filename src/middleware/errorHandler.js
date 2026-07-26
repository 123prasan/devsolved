/**
 * Central error handler middleware.
 * Catches errors thrown in route handlers and renders an error page.
 */
export const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Something went wrong';

  console.error(`[${new Date().toISOString()}] ${status} ${req.method} ${req.path}:`, message);

  // API routes → JSON error
  if (req.path.startsWith('/api/')) {
    return res.status(status).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // Page routes → render error page or redirect
  if (status === 404) {
    return res.status(404).render('pages/404', {
      title: '404 – Page Not Found | DevSolved',
      message,
      user: req.user || null,
    });
  }

  res.status(status).render('pages/error', {
    title: 'Error | DevSolved',
    message,
    status,
    user: req.user || null,
  });
};

/**
 * 404 catch-all — place AFTER all routes.
 */
export const notFound = (req, res, next) => {
  const err = new Error(`Not Found: ${req.originalUrl}`);
  err.status = 404;
  next(err);
};
