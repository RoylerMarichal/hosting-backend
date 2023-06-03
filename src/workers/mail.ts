 
import nodemailer from "nodemailer";

// async..await is not allowed in global scope, must use a wrapper
export const sendMail = async (email:string,html:string,subject:string):Promise<void>  => {
    
    try {
    
      // create reusable transporter object using the default SMTP transport
      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
            user: 'rosalee.reynolds@ethereal.email',
            pass: 'QZRzKXxW2mJUQ3cxFp'
        }
    });
    console.log('ddd3d');
      // send mail with defined transport object
      let info = await transporter.sendMail({
        from: '"Fred Foo 👻" <foo@example.com>', // sender address
        to: email, // list of receivers
        subject: subject, // Subject line
       // text: "Hello world?", // plain text body
        html: html, // html body
      });
    
      console.log("Message sent: %s", info.messageId);
      // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
    
      // Preview only available when sending through an Ethereal account
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
      // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
      
    } catch (error) {
      console.log(error);
      
    }
}


 
