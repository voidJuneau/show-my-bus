const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
var request = require('request');
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://cabvlkfxydjwhn:c73832f43ee0d5ee23f9b68988e4c7babf241b364ceede7087279162254a12e5@ec2-54-224-120-186.compute-1.amazonaws.com:5432/daohhucgl2gdqd",
  ssl: {
    rejectUnauthorized: false
  }
});

// /arrivals/agency_id/stop_id/route_id
module.exports = async (req, res) => {
  const agencyId = req.params.agencyId.toLowerCase();
  const stopId = req.params.stopId;
  let routeId = req.params.routeId;
  let url;
  switch (agencyId) {
    case "hsr":
      url = "https://opendata.hamilton.ca/GTFS-RT/GTFS_TripUpdates.pb";
      break;
    case "burlington":
      url = "http://opendata.burlington.ca/gtfs-rt/GTFS_TripUpdates.pb";
      break;
    case "go":
      break;
    default:
      res.status(400).json({ error: "Invalid agency ID"});
  }
  const requestSettings = {
    method: 'GET',
    url,
    encoding: null
  };
  if (agencyId !== "go") {
    try {
      // get data from realtime api
      request(requestSettings, async function (error, response, body) {
        const updates = [];
        if (!error && response.statusCode == 200) {
          var feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(body);
          feed.entity.some(entity => {
            if (entity.tripUpdate && entity.tripUpdate.trip.routeId === (
              // for hsr, there are offset (47) on route_id for realtime api, only god knows why
              agencyId === "hsr"? (parseInt(routeId)+47) + "" : routeId)) {
              entity.tripUpdate.stopTimeUpdate.some(u => {
                if (u.stopId === stopId) {
                  updates.push(u);
                  // There are only one update for that stop on one trip
                  return true;
                }
              });
              // get only two entries at most
              if (updates.length === 2)
                return true;
            }
          });
        }
        const schedules = await getSchedules(agencyId, stopId, routeId);
        console.log(agencyId, stopId, routeId);
        // console.log("u0", updates[0])
        // console.log("s0", schedules[0])
        console.log(schedules)
        // console.log(schedules[1], updates[1])
        for (let i=0; i<2; i++) {
          // When there are no data on first or second feed, substitute with scheduled one
          if (!updates[i] || updates[i].scheduleRelationship === "NO_DATA") {
            updates[i] = schedules[i]
          }
        }
        res.status(200).json( updates );
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({error: err});
    }
  } else { // go does not provide realtime data. service scheduled data instead
    try {
      const results = await getSchedules(agencyId, stopId, routeId);
      res.status(200).json( results );
    } catch (err) {
      console.error(err);
      res.status(500).json({error: err});
    }
  }
};

const getSchedules = async (agencyId, stopId, routeId) => {
  const command = 
    "SELECT DISTINCT st.arrival_time, st.departure_time " +
        "FROM stop_time AS st " +
        "INNER JOIN stop AS s ON (st.stop_id = s.stop_id) " +
        "INNER JOIN trip AS t ON (st.trip_id = t.trip_id) " +
        "INNER JOIN route AS r ON (t.route_id = r.route_id)" +
        `WHERE r.route_id = '${routeId}' AND ` +
          `s.stop_id = '${stopId}' AND ` +
          `LOWER(s.agency_id) LIKE LOWER('${agencyId}')`
  const client = await pool.connect();
  const result = await client.query(command);
  client.release();
  let results = [];
  if (result && result.rows) {
    result.rows.forEach(update => {
      let d = new Date();
      let [hours, minutes, seconds] = update.arrival_time.split(':');
      d.setHours(hours);
      d.setMinutes(minutes);
      d.setSeconds(seconds);
      // if the bus is already gone, change it as tomorrow's one
      if (d < Date.now())
        d.setDate(d.getDate() + 1);
      // stores only time first, for sorting
      results.push(d);
    });
    results.sort((a, b) => a.valueOf() - b.valueOf());
    results = results.map(d => ({
      arrival: {
        time: d.valueOf().toString() // for json delivery
      },
      departure: {
        time: d.valueOf().toString()
      },
      stopId,
      scheduleRelationship: "SCHEDULED"
    }))
  }
  return results.slice(0, 2);
}