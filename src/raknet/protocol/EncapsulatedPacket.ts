import {BinaryStream} from "../../binarystream/BinaryStream";
import {PacketReliability} from "./PacketReliability";

export class EncapsulatedPacket {

    static readonly RELIABILITY_SHIFT = 5;
    static readonly RELIABILITY_FLAGS = 0b111 << EncapsulatedPacket.RELIABILITY_SHIFT;

    static readonly SPLIT_FLAG = 0b00010000;

    public reliability: number = 0;
    public hasSplit: boolean = false;

    public messageIndex;
    // public sequenceIndex;

    public orderIndex;
    public orderChannel;

    public splitCount;
    public splitID;
    public splitIndex;

    public stream = new BinaryStream();
    public length: number;

    public needACK: boolean = false;

    static fromBinary(stream){
        let packet = new EncapsulatedPacket();

        let flags = stream.getByte();
        packet.reliability = ((flags & 0xe0) >> 5);
        packet.hasSplit = (flags & 0x10) > 0;

        packet.length = Math.ceil(stream.getShort() / 8);

        if(packet.isReliable()){
            packet.messageIndex = stream.getLTriad();
        }

        if(packet.isSequenced()){
            packet.orderIndex = stream.getLTriad();
            packet.orderChannel = stream.getByte();
        }

        if(packet.hasSplit){
            packet.splitCount = stream.getInt();
            packet.splitID = stream.getShort();
            packet.splitIndex = stream.getInt();
        }

        packet.stream = new BinaryStream(stream.buffer.slice(stream.offset, stream.offset + packet.length));
        stream.offset += packet.length;

        return packet;
    }

    // static fromBinary(stream) {
    //     let packet = new EncapsulatedPacket();
    //     let reliability, flags, hasSplit, lenght;
    //
    //     flags = stream.getByte();
    //     packet.reliability = reliability = (flags & this.RELIABILITY_FLAGS) >> this.RELIABILITY_SHIFT;
    //     packet.hasSplit = hasSplit = (flags & this.SPLIT_FLAG) > 0;
    //
    //     packet.length = lenght = Math.ceil(stream.getShort() / 8);
    //     if (lenght === 0) {
    //         throw new Error("Encapsulated payload length cannot be zero");
    //     }
    //
    //     if (reliability > PacketReliability.UNRELIABLE) {
    //         if (PacketReliability.isReliable(reliability)) {
    //             packet.messageIndex = stream.getLTriad();
    //         }
    //
    //         if (PacketReliability.isSequenced(reliability)) {
    //             packet.sequenceIndex = stream.getLTriad();
    //         }
    //
    //         if (PacketReliability.isSequencedOrOrdered(reliability)) {
    //             packet.orderIndex = stream.getLTriad();
    //             packet.orderChannel = stream.getByte();
    //         }
    //     }
    //
    //     if (hasSplit) {
    //         packet.splitCount = stream.getInt();
    //         packet.splitID = stream.getShort();
    //         packet.splitIndex = stream.getInt();
    //     }
    //
    //     packet.stream = new BinaryStream(stream.buffer.slice(stream.offset, stream.offset + packet.length));
    //     stream.offset += packet.length;
    //
    //     return packet;
    // }

    isReliable(){
        return (
            this.reliability === PacketReliability.RELIABLE ||
            this.reliability === PacketReliability.RELIABLE_ORDERED ||
            this.reliability === PacketReliability.RELIABLE_SEQUENCED ||
            this.reliability === PacketReliability.RELIABLE_WITH_ACK_RECEIPT ||
            this.reliability === PacketReliability.RELIABLE_ORDERED_WITH_ACK_RECEIPT
        );
    }

    isSequenced(){
        return (
            this.reliability === PacketReliability.UNRELIABLE_SEQUENCED ||
            this.reliability === PacketReliability.RELIABLE_ORDERED ||
            this.reliability === PacketReliability.RELIABLE_SEQUENCED ||
            this.reliability === PacketReliability.RELIABLE_ORDERED_WITH_ACK_RECEIPT
        );
    }

    toBinary(){
        let stream = new BinaryStream();

        stream.putByte((this.reliability << 5) | (this.hasSplit ? 0x10 : 0));
        stream.putShort(this.getBuffer().length << 3);

        if(this.isReliable()){
            stream.putLTriad(this.messageIndex);
        }

        if(this.isSequenced()){
            stream.putLTriad(this.orderIndex);
            stream.putByte(this.orderChannel);
        }

        if(this.hasSplit){
            stream.putInt(this.splitCount);
            stream.putShort(this.splitID);
            stream.putInt(this.splitIndex);
        }

        stream.append(this.getBuffer());

        return stream.buffer.toString("hex");
    }

    getLength(){
        return 3 + this.getBuffer().length + (this.messageIndex !== null ? 3 : 0) + (this.orderIndex !== null ? 4 : 0) + (this.hasSplit ? 10 : 0);
    }

    getStream(){
        return this.stream;
    }

    getBuffer(){
        return this.stream.buffer;
    }
}