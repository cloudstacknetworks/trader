
#!/bin/bash
# Simple script to run one chunk of the download

cd /home/ubuntu/oshaughnessy_trader/nextjs_space

echo "========================================="
echo "  Chunked Download - Running Next Chunk"
echo "========================================="
echo ""

# Run the chunk
yarn tsx scripts/download-alpaca-chunk.ts auto

echo ""
echo "========================================="
echo "  Chunk Complete!"
echo "========================================="
echo ""
echo "To run another chunk, execute:"
echo "  cd /home/ubuntu/oshaughnessy_trader/nextjs_space && ./run_chunk.sh"
