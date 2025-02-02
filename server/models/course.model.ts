import mongoose , { Schema, Document, Model } from "mongoose";
import { IUser } from "./user.model";


interface IComment extends Document {
    user: IUser;
    question: string;
    questionReplies: IComment[];
}

interface IReview extends Document {
    user: IUser;
    rating: number;
    comment: string;
    commentReplies?: IComment[];
}

interface ILink extends Document {
    title: string;
    url: string;
}

interface ICourseData extends Document {
    title: string;
    description: string;
    videoUrl: string;
    videoThumbnail: string;
    videoSection: string;
    videoLength: string;
    videoPlayer: string;
    links: ILink[];
    suggestion: string;
    questions: IComment[];
}

export interface ICourse extends Document {
    name: string;
    description: string;
    price: number;
    estimatedPrice?: number;
    thumbnail: object;
    tags: string;
    level: string;
    demoUrl: string;
    benefits: { title: string}[];
    prerequisites : {title: string}[];
    reviews: IReview[];
    coursesData: ICourseData[];
    rating?: number;
    purchased?: number;
}

const reviewSchema = new Schema<IReview>({
    user: Object,
    rating: {
        type: Number,
        default: 0,
    },
    comment: String,
    commentReplies: [Object],
});

const linkSchema = new Schema<ILink>({
    title: String,
    url: String,
});

const commentSchema = new Schema<IComment>({
    user: Object,
    question: String,
    questionReplies: [Object],
});

const courseDataSchema = new Schema<ICourseData>({
    title: String,
    description: String,
    videoUrl: String,
    // videoThumbnail: String,
    videoSection: String,
    videoLength: String,
    videoPlayer: String,
    links: [linkSchema],
    suggestion: String,
    questions: [commentSchema],
});

const courseSchema = new Schema<ICourse> ({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    estimatedPrice: {
        type: Number,
    },
    thumbnail: {
        public_id: {
            // required: true,
            type: String,
        },
        url: {
            type: String,
            // required: true,
        },
    },
    tags: {
        type: String,
        required: true,
    },
    level: {
        type: String,
        required: true,
    },
    demoUrl: {
        type: String,
        required: true,
    },
    benefits: [{title: String}],
    prerequisites: [{title: String}],
    reviews: [reviewSchema],
    coursesData: [courseDataSchema],
    rating: {
        type: Number,
        default: 0,
    },
    purchased: {
        type: Number,
        default: 0,
    },

})

const CourseModel: Model<ICourse> =  mongoose.model("Course", courseSchema);
export default CourseModel;