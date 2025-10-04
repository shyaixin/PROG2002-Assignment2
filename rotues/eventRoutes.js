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


/**
 * GET /api/events/search
 * search filter（date/location/ngo/category）
 */
router.get('/search', (req, res) => {
  const {
    date,
    location,
    ngo,
    category
  } = req.query;

  const values = [];
  // exclude suspended
  let where = ` AND e.status <> 'suspended'`;

  // between start_date and end_date
  if (date) {
    where += ` AND ? BETWEEN start_date AND end_date`;
    values.push(date);
  }

  // location
  if (location && location.trim()) {
    where += ` AND e.location LIKE ?`;
    values.push(`%${location.trim()}%`);
  }

  // NGO filter
  if (ngo && /^\d+$/.test(ngo)) {
    where += ` AND e.ngo_id = ?`;
    values.push(parseInt(ngo, 10));
  }

  // category filter
  if (category && /^\d+$/.test(category)) {
    where += ` AND e.category = ?`;
    values.push(category);
  }

  // search sql
  const searchSql = `
    SELECT e.*, n.ngo_name
    FROM event e
    JOIN ngo n ON n.ngo_id = e.ngo_id
    WHERE ${where}
    ORDER BY e.start_date ASC
  `;

  // search events
  conn.query(searchSql, values, (e, rows) => {
    if (e) {
      console.error(e);
      res.status(500).send({error: 'Failed to Search events'});
    } else {
      res.json(rows);
    }
  });
});

module.exports = router
