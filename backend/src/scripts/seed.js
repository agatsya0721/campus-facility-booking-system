import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";

const run = async () => {
  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const { rows: roles } = await pool.query("SELECT id, name FROM roles");
  const roleMap = Object.fromEntries(roles.map((role) => [role.name, role.id]));

  await pool.query(
    `INSERT INTO users (role_id, name, email, password_hash, department)
     VALUES ($1, 'System Admin', 'admin@campus.local', $2, 'Administration')
     ON CONFLICT (email) DO NOTHING`,
    [roleMap.admin, adminPassword]
  );

  await pool.query(
    `INSERT INTO facilities (name, code, type, location, capacity, description, amenities)
     VALUES
      ('Raman Hall', 'SEM-101', 'classroom', 'Academic Block A', 120, 'Primary seminar hall for campus events and talks', '["projector","ac","mic"]'),
      ('Naidu Hall', 'SEM-102', 'classroom', 'Academic Block B', 100, 'Secondary seminar hall for department sessions', '["projector","ac","podium"]'),
      ('Sardar Patel Auditorium', 'AUD-001', 'auditorium', 'Central Campus', 500, 'Large auditorium for major campus events', '["stage","sound-system","projector"]'),
      ('Basketball Court', 'SPT-201', 'sports', 'Sports Complex', 22, 'Outdoor basketball court', '["floodlights","scoreboard"]'),
      ('Badminton Court', 'SPT-202', 'sports', 'Indoor Arena', 8, 'Indoor badminton court', '["indoor-court","equipment"]'),
      ('Pickleball Court', 'SPT-203', 'sports', 'Recreation Zone', 4, 'Pickleball practice and match court', '["paddle-storage","lights"]'),
      ('Volleyball Court', 'SPT-204', 'sports', 'Outdoor Courts', 12, 'Outdoor volleyball court', '["net-setup","seating"]'),
      ('Lawn Tennis Court', 'SPT-205', 'sports', 'West Ground', 4, 'Lawn tennis court', '["night-lights","equipment"]'),
      ('Football Ground', 'SPT-206', 'sports', 'Main Sports Field', 22, 'Full-sized football ground', '["goal-posts","floodlights","gallery"]')
     ON CONFLICT (code) DO NOTHING`
  );

  await pool.end();
  console.log("Seed completed.");
};

run().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
