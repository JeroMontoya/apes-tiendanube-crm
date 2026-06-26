export default function handler(req, res) {
  // Capture any query parameters or body parameters
  const params = { ...req.query, ...(req.body || {}) };
  const queryString = new URLSearchParams(params).toString();
  
  // Respond with a 303 to ensure it turns into a GET request for the static React app
  res.redirect(303, `/?${queryString}`);
}
