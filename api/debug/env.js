export default function handler(req, res) {
  res.status(200).json({
    intervals_key_present: !!process.env.INTERVALS_API_KEY,
    intervals_key_length: process.env.INTERVALS_API_KEY?.length || 0,
    intervals_athlete: process.env.INTERVALS_ATHLETE_ID || "not set",
    node_env: process.env.NODE_ENV,
  });
}
