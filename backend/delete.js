// Script to delete all job embeddings from Pinecone
// Run: node delete.js

require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function deleteJobEmbeddings() {
    console.log('Connecting to Pinecone...');

    const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
    });

    const indexName = process.env.PINECONE_INDEX_NAME;
    const index = pinecone.Index(indexName);

    console.log(`Connected to index: ${indexName}`);

    try {
        // Delete all vectors with docId = 'scraped-job'
        console.log('Deleting all job embeddings (docId: scraped-job)...');

        // First, query to get all job vector IDs
        const queryResult = await index.query({
            vector: new Array(1536).fill(0), // Dummy vector for query (768 dimensions for all-mpnet-base-v2)
            topK: 10000,
            filter: { docId: 'scraped-job' },
            includeMetadata: false,
        });

        if (queryResult.matches && queryResult.matches.length > 0) {
            const ids = queryResult.matches.map((match) => match.id);
            console.log(`Found ${ids.length} job embeddings to delete`);

            // Delete in batches of 1000
            const batchSize = 1000;
            for (let i = 0; i < ids.length; i += batchSize) {
                const batch = ids.slice(i, i + batchSize);
                await index.deleteMany(batch);
                console.log(
                    `Deleted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(ids.length / batchSize)}`,
                );
            }

            console.log(` Successfully deleted ${ids.length} job embeddings`);
        } else {
            console.log('No job embeddings found to delete');
        }
    } catch (error) {
        console.error('Error deleting job embeddings:', error);
    }
}

deleteJobEmbeddings();
