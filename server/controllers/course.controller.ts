import { Request, Response, NextFunction } from "express";
import courseModel from "../models/course.model";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import CourseModel, { ICourse } from "./../models/course.model";
import cloudinary from "cloudinary";
import { redis } from "../utils/redis";
import { createCourse } from "../services/course.service";
import mongoose from "mongoose";
import sendMail  from "../utils/sendMail";
import ejs from "ejs";
import path from "path";
import NotificationModel from "../models/notificationModel";
import {getAllCoursesService} from "../services/course.service";
require("dotenv").config();

export const uploadCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;
      if (thumbnail) {
        const result = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });
        data.thumbnail = {
          public_id: result.public_id,
          url: result.secure_url,
        };
      }
      createCourse(data, res, next);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

//edit course

export const editCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;
      if (thumbnail) {
        await cloudinary.v2.uploader.destroy(data.thumbnail.public_id);
        const result = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });
        data.thumbnail = {
          public_id: result.public_id,
          url: result.secure_url,
        };
      }
      const courseId = req.params.id;
      const course = await courseModel.findByIdAndUpdate(
        courseId,
        {
          $set: data,
        },
        { new: true }
      );
      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// get single course without purchasing

export const getSingleCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      const isCachExist = await redis.get(courseId);
      if (isCachExist) {
        const course = JSON.parse(isCachExist);
        res.status(200).json({
          success: true,
          course,
        });
      } else {
        const course = await CourseModel.findById(req.params.id).select(
          "-coursesData.videoUrl -coursesData.suggestion -coursesData.questions -coursesData.links"
        );
        await redis.set(courseId, JSON.stringify(course));
        res.status(200).json({
          succsses: true,
          course,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

//get all course

export const getAllCourses = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isCachExist = await redis.get("allCourses");
      if (isCachExist) {
        const courses = JSON.parse(isCachExist);
        res.status(200).json({
          success: true,
          courses,
        });
      } else {
        const courses = await CourseModel.find().select(
          "-coursesData.videoUrl -coursesData.suggestion -coursesData.questions -coursesData.links"
        );
        await redis.set("allCourses", JSON.stringify(courses));
        res.status(200).json({
          success: true,
          courses,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// get course content // only for valid user
export const getCourseByUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCourseList = req.user?.courses;
      const courseId = req.params.id;
      const courseExists = userCourseList.find(
        (course: any) => course._id.toString() === courseId
      );
      if (!courseExists) {
        return next(
          new ErrorHandler("You are not enrolled in this course", 404)
        );
      }
      const course = await CourseModel.findById(courseId);
      const content = course?.coursesData;
      res.status(200).json({
        success: true,
        content,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// add question in course

interface IAddQuestionData {
  question: string;
  courseId: string;
  contentId: string;
}

export const addQuestion = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { question, courseId, contentId } : IAddQuestionData = req.body;

      const course = await CourseModel.findById(courseId);
      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler("Invalid content id", 400));
      }
      const courseContent = course?.coursesData?.find(
        (content: any) => content._id.toString() === contentId
      )
      if (!courseContent) {
        return next(new ErrorHandler("Course content not found", 404));
      }
      const questionData: any = {
        question,
        user: req.user,
        questionReplies: [],
      };

      courseContent.questions.push(questionData);
      await NotificationModel.create({
        userId: req.user?._id,
        title: "new Question Received",
        message: `You have new question in ${courseContent.title}`,
    });
      await course?.save();
      res.status(200).json({
        success: true,
        message: "Question added successfully",
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  });

  // add answer in course question

interface IAnswerData {
  answer: string;
  questionId: string;
  courseId: string;
  contentId: string;
}

export const addAnswer = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { answer, questionId, courseId, contentId } : IAnswerData = req.body;

      const course = await CourseModel.findById(courseId);
      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler("Invalid content id", 400));
      }
      const courseContent = course?.coursesData?.find(
        (content: any) => content._id.toString() === contentId
      )
      if (!courseContent) {
        return next(new ErrorHandler("Course content not found", 404));
      }
      const question = courseContent.questions.find(
        (question: any) => question._id.toString() === questionId
      );
      if (!question) {
        return next(new ErrorHandler("Question not found", 404));
      }
      const answerData: any = {
        answer,
        user: req.user,
      };

      question.questionReplies.push(answerData);
      await course?.save();
      if(req.user?._id === question.user._id){
        //create a notification
        await NotificationModel.create({
          userId: req.user?._id,
          title: "New Answer",
          message: `You have new answer in ${courseContent.title}`,
        })
      } else {
        const data = {
          name: question.user.name,
          title: courseContent.title,
        };
        const html = await ejs.renderFile(
          path.join(__dirname, "../mails/question-reply.ejs"),
          data
        );
        try {
          await sendMail({
            email: question.user.email,
            subject: "Reply to your question",
            template: "question-reply",
            data,
          });
        } catch (error: any) {
          return next(new ErrorHandler(error.message, 500));
        }
      }
      res.status(200).json({
        success: true,
        message: "Answer added successfully",
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  });

  // add review in course
interface IAddReviewData {
  review: string;
  courseId : string;
  rating : number;
  userId: string;
}

export const addReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCourseList = req.user?.courses;
      console.log("hello")
      console.log(userCourseList);
      const courseId = req.params.id;
      
      // check if user already reviewed the course
      const courseIdExists = userCourseList?.some((course: any) => {
        return course._id.toString() === courseId;
      });

      if (!courseIdExists) {
        return next(
          new ErrorHandler("You are not enrolled in this course", 404)
        );
      }
      const course = await CourseModel.findById(courseId);
      const {review, rating} = req.body as IAddReviewData;
      const reviewData: any = {
        user: req.user,
        review,
        rating
      };
      course?.reviews.push(reviewData);
      let avg  = 0;
      course?.reviews.forEach((review: any) => {
        avg += review.rating;
      })
      if (course) {
        course.rating = avg / course.reviews.length;
      }
      await course?.save();

      const notification = {
        title: "New Review",
        message: `${req.user?.name} added a review in ${course?.name}`,
      }
      res.status(200).json({
        success: true,
        message: "Review added successfully",
        course,
      })
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// add reply in review
interface IAddReviewData {
  comment: string;
  courseId : string;
  reviewId: String;
}
export const addReplyToReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {comment, courseId, reviewId} = req.body as IAddReviewData;
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }
      const review = course?.reviews?.find((review: any) => review._id.toString() === reviewId);
      if (!review) {
        return next(new ErrorHandler("Review not found", 404));
      }
      const replyData: any = {
        user: req.user,
        comment
      };
      if (!review.commentReplies) {
        review.commentReplies = [];
      }
      review.commentReplies?.push(replyData);
      await course?.save();
      res.status(200).json({
        success: true,
        message: "Reply added successfully",
        course,
      })
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// get all courses ---only for admin

export const getAllCoursesAdmin= CatchAsyncError( async(req: Request, res: Response, next: NextFunction) => {
  try {
    getAllCoursesService(res);
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
})
