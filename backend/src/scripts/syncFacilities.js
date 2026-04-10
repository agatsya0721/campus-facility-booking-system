import { pool } from "../config/db.js";

const facilities = [
  {
    name: "Raman Hall",
    code: "SEM-101",
    type: "classroom",
    location: "Academic Block A",
    capacity: 120,
    description: "Primary seminar hall for campus events and talks",
    amenities: ["projector", "ac", "mic"]
  },
  {
    name: "Naidu Hall",
    code: "SEM-102",
    type: "classroom",
    location: "Academic Block B",
    capacity: 100,
    description: "Secondary seminar hall for department sessions",
    amenities: ["projector", "ac", "podium"]
  },
  {
    name: "Sardar Patel Auditorium",
    code: "AUD-001",
    type: "auditorium",
    location: "Central Campus",
    capacity: 500,
    description: "Large auditorium for major campus events",
    amenities: ["stage", "sound-system", "projector"]
  },
  {
    name: "Basketball Court",
    code: "SPT-201",
    type: "sports",
    location: "Sports Complex",
    capacity: 22,
    description: "Outdoor basketball court",
    amenities: ["floodlights", "scoreboard"]
  },
  {
    name: "Badminton Court",
    code: "SPT-202",
    type: "sports",
    location: "Indoor Arena",
    capacity: 8,
    description: "Indoor badminton court",
    amenities: ["indoor-court", "equipment"]
  },
  {
    name: "Pickleball Court",
    code: "SPT-203",
    type: "sports",
    location: "Recreation Zone",
    capacity: 4,
    description: "Pickleball practice and match court",
    amenities: ["paddle-storage", "lights"]
  },
  {
    name: "Volleyball Court",
    code: "SPT-204",
    type: "sports",
    location: "Outdoor Courts",
    capacity: 12,
    description: "Outdoor volleyball court",
    amenities: ["net-setup", "seating"]
  },
  {
    name: "Lawn Tennis Court",
    code: "SPT-205",
    type: "sports",
    location: "West Ground",
    capacity: 4,
    description: "Lawn tennis court",
    amenities: ["night-lights", "equipment"]
  },
  {
    name: "Football Ground",
    code: "SPT-206",
    type: "sports",
    location: "Main Sports Field",
    capacity: 22,
    description: "Full-sized football ground",
    amenities: ["goal-posts", "floodlights", "gallery"]
  }
];

const run = async () => {
  await pool.query("BEGIN");

  try {
    await pool.query("DELETE FROM notifications");
    await pool.query("DELETE FROM waiting_list");
    await pool.query("DELETE FROM bookings");
    await pool.query("DELETE FROM recurring_bookings");
    await pool.query("DELETE FROM facilities");

    for (const facility of facilities) {
      await pool.query(
        `INSERT INTO facilities (name, code, type, location, capacity, description, amenities)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          facility.name,
          facility.code,
          facility.type,
          facility.location,
          facility.capacity,
          facility.description,
          JSON.stringify(facility.amenities)
        ]
      );
    }

    await pool.query("COMMIT");
    console.log("Facility catalog synced.");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  } finally {
    await pool.end();
  }
};

run().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
