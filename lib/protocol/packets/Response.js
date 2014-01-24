module.exports = Packet;

function Packet(buffer) {
    var split = buffer.readInt32LE(0);
    if(split == Packet.HEADER_SINGLE) {
        this.split = false;
        this.payload = buffer.slice(4);
    }
    else if(split == Packet.HEADER_SPLIT) {
        this.split = true;
        

        this.id = buffer.readInt32LE(4);
        if(this.id >> Packet.COMPRESS.SHIFT == 1) this.compressed = true;
        else this.compressed = false;

        this.total = buffer.readUInt8LE(8); // Total number of packets in response
        this.number = buffer.readUInt8LE(9); // The number of this packet

        this.maxSize = buffer.readUInt16LE(10);

        if(this.number == 0 && this.compressed) {
            this.size = buffer.readInt32LE(12);
            this.crc32 = buffer.readInt32LE(16);
            this.payload = buffer.slice(20);
        }
        else this.payload = buffer.slice(12);
    }
    else {
        throw new Error('Could not decode packet header ' + split);
    }
}

Packet.HEADER_SPLIT = 0xFFFFFFFE;
Packet.HEADER_SINGLE = 0xFFFFFFFF;
Packet.COMPRESS_SHIFT = 31;
