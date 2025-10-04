const express = require('express');
const db = require('../event_db');
const conn = db.getConnection();
conn.connect();

const router = express.Router();

/**
 * GET /api/events/home
 * home data：only show 'active' event (exclude suspended/draft)
 */
router.get('/', (req, res) => {
  // upcoming event sql
  const upcomingSql = `
    SELECT e.*, n.ngo_name
    FROM event e
    JOIN ngo n ON n.ngo_id = e.ngo_id
    WHERE e.status = 'active' AND (e.end_date IS NULL OR e.end_date >= NOW())
    ORDER BY e.start_date ASC
  `;
  // past event sql
  const pastSql = `
    SELECT e.*, n.ngo_name
    FROM event e
    JOIN ngo n ON n.ngo_id = e.ngo_id
    WHERE e.status = 'active'
      AND e.end_date IS NOT NULL
      AND e.end_date < NOW()
    ORDER BY e.end_date DESC
  `;

  // query upcoming and past events
  conn.query(upcomingSql, (e, upcomingRows) => {
    if (e) {
      console.error(e);
      res.status(500).send({ error: 'Failed to Query upcoming events' });
    } else {
      conn.query(pastSql, (e1, pastRows) => {
        if (e1) {
          console.error(e1);
          res.status(500).send({ error: 'Failed to Query past events' });
        } else {
          res.json({
            upcoming: upcomingRows,
            past: pastRows
          });
        }
      })
    }
  })
});

module.exports = router
