import nodemailer , { Transporter } from "nodemailer";
import ejs from 'ejs';
import path from 'path';

interface EmailOptions {
    email: string;
    template: string;
    subject: string;
    data: {[key:string]: any};
}

const sendMail = async (options: EmailOptions): Promise<void> => { 

    const transporter: Transporter = nodemailer.createTransport({
        // host: process.env.SMTP_HOST,
        // port: Number(process.env.SMTP_PORT),
        service: 'gmail',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
    const {email, template, subject, data} = options;

    const templatePath = path.join(__dirname, `../mails/${template}.ejs`);

    const html = await ejs.renderFile(templatePath, data);

    const mailOptions = {
        from: process.env.SMTP_FROM,
        to: email,
        subject,
        html
    }

    await transporter.sendMail(mailOptions);
}

export default sendMail;