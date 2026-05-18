import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true, _id: true })
export class CheckList {
    _id?: Types.ObjectId;

    @Prop({ required: true })
    criterion: string;
    // e.g. "Explains past experience with concrete examples"

    @Prop({ required: true })
    category: string;
    // e.g. "Experience", "Communication", "Technical"

    // Scoring definition (HR can accept defaults)
    @Prop({
        type: {
            min: Number,
            max: Number,
            anchors: {
                type: Map,
                of: String,
            },
        },
        required: true,
    })
    scoring: {
        min: number; // default 1
        max: number; // default 5
        anchors: Record<number, string>;
    };

    @Prop({ default: true })
    enabled?: boolean;
}

export const CheckListSchema = SchemaFactory.createForClass(CheckList);

// [
//     {
//         criterion:
//             'Clearly explains background, education, and past experience with concrete examples',
//         category: 'Experience',
//         scoring: {
//             min: 1,
//             max: 5,
//             anchors: {
//                 '1': 'Unclear or vague background, no concrete experience mentioned',
//                 '3': 'Mentions education and experience but lacks specificity or structure',
//                 '5': 'Clearly structured summary with education, years of experience, industries, and examples',
//             },
//         },
//         enabled: true,
//     },
//     {
//         criterion:
//             'Communicates confidently and responds appropriately to follow-up questions',
//         category: 'Communication',
//         scoring: {
//             min: 1,
//             max: 5,
//             anchors: {
//                 '1': 'Struggles to respond, answers are incomplete or confusing',
//                 '3': 'Understands questions and responds adequately with some hesitation',
//                 '5': 'Responds confidently, clarifies when needed, and adapts to follow-ups',
//             },
//         },
//         enabled: true,
//     },
//     {
//         criterion:
//             'Demonstrates understanding of SQL window functions and their use cases',
//         category: 'Technical',
//         scoring: {
//             min: 1,
//             max: 5,
//             anchors: {
//                 '1': 'Incorrect or no understanding of window functions',
//                 '3': 'Basic understanding but explanation is incomplete or partially incorrect',
//                 '5': 'Clearly explains what window functions are and when to use them with correct comparison to GROUP BY',
//             },
//         },
//         enabled: true,
//     },
// ];
