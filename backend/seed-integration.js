/**
 * seed-integration.js
 *
 * 1. Drops & recreates the HR tables in Neon PostgreSQL (new schema)
 * 2. Inserts sample master data (departments, benefits, skills)
 * 3. Encrypts the Neon connection with AES-256-GCM
 * 4. Deletes any existing IntegrationConfig for the tenant
 * 5. Inserts a fresh IntegrationConfig document in MongoDB
 *
 * Run: node seed-integration.js
 */

const { MongoClient, ObjectId } = require('mongodb');
const { Client: PgClient } = require('pg');
const { createCipheriv, randomBytes } = require('crypto');

// ─── Config ───────────────────────────────────────────────────────────────────

const MONGO_URI =
    'mongodb+srv://musharrafabdullah84:jQRRXeqkucn9Lgrq@jobsinc.isvw2hy.mongodb.net/?retryWrites=true&w=majority&appName=jobsinc';

const NEON_URL =
    'postgresql://neondb_owner:npg_1SnVgkhZuf7w@ep-quiet-pine-adagsfcm-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const ENCRYPTION_KEY_HEX =
    'fa51a1b095681f5261f4d7f18be6579791082dace409faf1287072aaec1f2e09';

// ─── Encryption (mirrors CredentialEncryptionService) ─────────────────────────

function encrypt(connectionConfig) {
    const key = Buffer.from(ENCRYPTION_KEY_HEX.slice(0, 32), 'utf8');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const plaintext = JSON.stringify(connectionConfig);
    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [
        iv.toString('hex'),
        tag.toString('hex'),
        encrypted.toString('hex'),
    ].join(':');
}

// ─── PostgreSQL Schema ─────────────────────────────────────────────────────────

const DROP_TABLES_SQL = `
DROP TABLE IF EXISTS employee_skills       CASCADE;
DROP TABLE IF EXISTS employee_benefits     CASCADE;
DROP TABLE IF EXISTS employee_certifications CASCADE;
DROP TABLE IF EXISTS employees             CASCADE;
DROP TABLE IF EXISTS skills                CASCADE;
DROP TABLE IF EXISTS benefits              CASCADE;
DROP TABLE IF EXISTS departments           CASCADE;
`;

const CREATE_TABLES_SQL = `
-- ── Master tables ─────────────────────────────────────────────────────────────

CREATE TABLE departments (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL
);

CREATE TABLE benefits (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL
);

CREATE TABLE skills (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status     BOOLEAN DEFAULT TRUE
);

-- ── Primary table ─────────────────────────────────────────────────────────────

CREATE TABLE employees (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  email         VARCHAR(200) UNIQUE NOT NULL,
  job_title     VARCHAR(200),
  phone         VARCHAR(50),
  timezone      VARCHAR(100),
  cv_url        TEXT,
  cv_match_score DECIMAL(5,2),
  applicant_ref VARCHAR(100),

  -- FK to departments master
  department_id INT,

  -- Scalar HR fields
  salary        NUMERIC(12,2),
  joining_date  DATE,

  hired_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_department
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- ── O2M with reference ────────────────────────────────────────────────────────

CREATE TABLE employee_benefits (
  id          SERIAL PRIMARY KEY,
  employee_id INT NOT NULL,
  benefit_id  INT NOT NULL,
  amount      NUMERIC(10,2),

  CONSTRAINT fk_emp_benefit_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,

  CONSTRAINT fk_emp_benefit_benefit
    FOREIGN KEY (benefit_id)  REFERENCES benefits(id)
);

-- ── M2M with reference ────────────────────────────────────────────────────────

CREATE TABLE employee_skills (
  employee_id INT NOT NULL,
  skill_id    INT NOT NULL,

  PRIMARY KEY (employee_id, skill_id),

  CONSTRAINT fk_emp_skill_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,

  CONSTRAINT fk_emp_skill_skill
    FOREIGN KEY (skill_id) REFERENCES skills(id)
);
`;

const SEED_DATA_SQL = `
INSERT INTO departments (name) VALUES
  ('Engineering'),
  ('Finance'),
  ('Human Resources');

INSERT INTO benefits (name) VALUES
  ('Health Insurance'),
  ('Transport Allowance'),
  ('Meal Allowance');

INSERT INTO skills (name) VALUES
  ('NodeJS'),
  ('PostgreSQL'),
  ('Docker'),
  ('AWS');
`;

// ─── IntegrationConfig document ───────────────────────────────────────────────

function buildConfig(tenantId, encryptedConnection) {
    return {
        tenantId: new ObjectId(tenantId),
        isActive: true,
        dbType: 'postgresql',
        encryptedConnection,
        tables: [
            {
                // ── Primary table: employees ────────────────────────────────────────
                tableName: 'employees',
                tableSchema: 'public',
                isPrimary: true,
                primaryKey: 'id',

                // Candidate fields → DB columns (auto-mapped from candidate object)
                columns: [
                    {
                        sourceField: 'fullName',
                        targetColumn: 'name',
                        required: true,
                    },
                    {
                        sourceField: 'email',
                        targetColumn: 'email',
                        required: true,
                    },
                    {
                        sourceField: 'contact',
                        targetColumn: 'phone',
                        required: false,
                    },
                    {
                        sourceField: 'timezone',
                        targetColumn: 'timezone',
                        required: false,
                    },
                    {
                        sourceField: 'cvUrl',
                        targetColumn: 'cv_url',
                        required: false,
                    },
                    {
                        sourceField: 'cvMatch',
                        targetColumn: 'cv_match_score',
                        required: false,
                    },
                    {
                        sourceField: 'jobTitle',
                        targetColumn: 'job_title',
                        required: false,
                    },
                    {
                        sourceField: 'applicantId',
                        targetColumn: 'applicant_ref',
                        required: false,
                    },
                ],

                // Scalar fields HR fills at hire time
                extraFields: [
                    {
                        fieldKey: 'department_id',
                        label: 'Department',
                        fieldType: 'select',
                        required: true,
                        targetColumn: 'department_id',
                        // Dynamic: options loaded from the departments master table
                        referenceTable: 'departments',
                        referenceQuery: 'SELECT id, name FROM departments',
                        referenceIdField: 'id',
                        referenceDisplayField: 'name',
                    },
                    {
                        fieldKey: 'salary',
                        label: 'Annual Salary',
                        fieldType: 'number',
                        required: true,
                        targetColumn: 'salary',
                    },
                    {
                        fieldKey: 'joining_date',
                        label: 'Joining Date',
                        fieldType: 'date',
                        required: true,
                        targetColumn: 'joining_date',
                    },
                ],

                // Array relations driven by extraData passed at hire time
                relations: [
                    {
                        // ── O2M with reference: employee_benefits ─────────────────────
                        // extraData.benefits = [{referenceId: '1', amount: '500'}, ...]
                        type: 'one-to-many',
                        childTable: 'employee_benefits',
                        foreignKey: 'employee_id',
                        sourceArrayField: 'benefits',
                        // Reference table: HR selects from cached benefits list
                        referenceTable: 'benefits',
                        referenceQuery: 'SELECT id, name FROM benefits',
                        referenceIdField: 'id',
                        referenceDisplayField: 'name',
                        childReferenceKey: 'benefit_id',
                        // Additional columns per row (besides the reference FK)
                        childColumns: [
                            {
                                sourceField: 'amount',
                                targetColumn: 'amount',
                                required: false,
                            },
                        ],
                    },
                    {
                        // ── M2M with reference: employee_skills ───────────────────────
                        // extraData.skills = ['1', '3', '4']  (array of skill IDs)
                        type: 'many-to-many',
                        sourceArrayField: 'skills',
                        junctionTable: 'employee_skills',
                        junctionParentKey: 'employee_id',
                        junctionChildKey: 'skill_id',
                        // Reference table: HR picks skills from cached list (checkboxes)
                        referenceTable: 'skills',
                        referenceQuery:
                            'SELECT id, name FROM skills WHERE status = TRUE',
                        referenceIdField: 'id',
                        referenceDisplayField: 'name',
                    },
                ],
            },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    // ── 1. Recreate Neon tables ─────────────────────────────────────────────────
    console.log('→ Connecting to Neon PostgreSQL...');
    const pg = new PgClient({
        connectionString: NEON_URL,
        ssl: { rejectUnauthorized: false },
    });
    await pg.connect();
    console.log('✓ Connected to Neon');

    console.log('→ Dropping old tables...');
    await pg.query(DROP_TABLES_SQL);
    console.log('✓ Old tables dropped');

    console.log('→ Creating new tables...');
    await pg.query(CREATE_TABLES_SQL);
    console.log(
        '✓ Tables created: departments, benefits, skills, employees, employee_benefits, employee_skills',
    );

    console.log('→ Inserting master data...');
    await pg.query(SEED_DATA_SQL);
    console.log('✓ Master data inserted');
    console.log(
        '   departments: Engineering(1), Finance(2), Human Resources(3)',
    );
    console.log(
        '   benefits:    Health Insurance(1), Transport Allowance(2), Meal Allowance(3)',
    );
    console.log('   skills:      NodeJS(1), PostgreSQL(2), Docker(3), AWS(4)');

    await pg.end();

    // ── 2. Connect to MongoDB ───────────────────────────────────────────────────
    console.log('\n→ Connecting to MongoDB...');
    const mongo = new MongoClient(MONGO_URI);
    await mongo.connect();
    const db = mongo.db('test');
    console.log('✓ Connected to MongoDB');

    const tenant = await db.collection('tenants').findOne({});
    if (!tenant) throw new Error('No tenant found. Create a tenant first.');
    console.log(
        `✓ Using tenant: ${tenant._id} (${tenant.name ?? tenant.companyName ?? 'unknown'})`,
    );

    // ── 3. Encrypt connection ───────────────────────────────────────────────────
    const encryptedConnection = encrypt({
        connectionString: NEON_URL,
        database: 'neondb',
        ssl: true,
    });
    console.log('✓ Connection encrypted');

    // ── 4. Delete old config + insert new ──────────────────────────────────────
    const collection = db.collection('integrationConfigs');

    const deleted = await collection.deleteOne({ tenantId: tenant._id });
    if (deleted.deletedCount > 0) {
        console.log('✓ Old IntegrationConfig deleted');
    }

    // Also clear the reference data cache for this tenant so it re-syncs fresh
    const refDeleted = await db.collection('integrationRefCache').deleteMany({
        tenantId: tenant._id,
    });
    if (refDeleted.deletedCount > 0) {
        console.log(
            `✓ Cleared ${refDeleted.deletedCount} cached reference table(s)`,
        );
    }

    const doc = buildConfig(tenant._id.toString(), encryptedConnection);
    const result = await collection.insertOne(doc);
    console.log(`✓ New IntegrationConfig inserted (id: ${result.insertedId})`);

    await mongo.close();

    console.log('\n✅ Seed complete!\n');
    console.log('Schema summary:');
    console.log(
        '  departments      — master (dept 1=Engineering, 2=Finance, 3=HR)',
    );
    console.log(
        '  benefits         — master (1=Health Insurance, 2=Transport, 3=Meal)',
    );
    console.log(
        '  skills           — master (1=NodeJS, 2=PostgreSQL, 3=Docker, 4=AWS)',
    );
    console.log('  employees        — primary table (FK → departments)');
    console.log(
        '  employee_benefits — O2M with reference (FK → benefits + amount)',
    );
    console.log('  employee_skills  — M2M junction (FK → employees + skills)');
    console.log('\nNext steps:');
    console.log(
        '  1. In Settings → DB Integration → click "Sync Reference Data"',
    );
    console.log(
        '     This caches benefits and skills into MongoDB for the hire dialog.',
    );
    console.log('  2. Hire a candidate — the dialog will show:');
    console.log('     • Department (select 1/2/3)');
    console.log('     • Salary, Joining Date (scalars)');
    console.log('     • Benefits (rows: select benefit + enter amount)');
    console.log('     • Skills (checkboxes from synced skills list)');
}

main().catch((err) => {
    console.error('✗ Seed failed:', err.message);
    process.exit(1);
});
