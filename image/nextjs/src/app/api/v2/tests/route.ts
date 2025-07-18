import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = 'tilt';

let client: MongoClient;

async function getClient() {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }
  return client;
}

// GET /api/v2/tests - Get all tests
export async function GET() {
  try {
    const client = await getClient();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection('tests');
    
    const tests = await collection.find({}).toArray();
    
    // Convert ObjectId to string for JSON serialization
    const serializedTests = tests.map(test => ({
      ...test,
      id: test._id.toString(),
      _id: undefined,
      lastRun: test.lastRun || null
    }));
    
    return NextResponse.json(serializedTests);
  } catch (error) {
    console.error('Error fetching tests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tests' },
      { status: 500 }
    );
  }
}

// POST /api/v2/tests - Create new test
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, tags, steps } = body;
    
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    
    const client = await getClient();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection('tests');
    
    const test = {
      name,
      tags: tags || [],
      steps: steps || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const result = await collection.insertOne(test);
    
    const createdTest = {
      ...test,
      id: result.insertedId.toString()
    };
    
    return NextResponse.json(createdTest, { status: 201 });
  } catch (error) {
    console.error('Error creating test:', error);
    return NextResponse.json(
      { error: 'Failed to create test' },
      { status: 500 }
    );
  }
}