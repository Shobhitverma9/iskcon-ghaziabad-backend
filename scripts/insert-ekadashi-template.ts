import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailTemplate, EmailTemplateDocument } from '../src/modules/notification/schemas/email-template.schema';

async function insertTemplate() {
  const app = await NestFactory.createApplicationContext(AppModule);
  // Get the model from the DI container safely using its token
  const templateModel = app.get<Model<EmailTemplateDocument>>(getModelToken(EmailTemplate.name));

  const name = 'Kamada Ekadashi 2026';
  const subject = '🌙 Blessings of Kamada Ekadashi - Fulfill Your Spiritual Desires';
  const htmlBody = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden; background-color: #fff;">
        <div style="background-color: #f7941d; padding: 0; text-align: center;">
            <img src="https://res.cloudinary.com/ddcfe7ux2/image/upload/v1774625822/kamada-ekadashi-2026.jpg" alt="Kamada Ekadashi" style="width: 100%; max-width: 600px; display: block;">
        </div>
        
        <div style="padding: 30px; line-height: 1.6; color: #333;">
            <h1 style="color: #d1440c; font-size: 26px; text-align: center; margin-bottom: 10px;">Hare Krishna! 🙏</h1>
            <p style="text-align: center; font-style: italic; color: #8E1B3A; font-weight: bold;">"Please accept our humble obeisances. All glories to Srila Prabhupada."</p>
            
            <p style="margin-top: 25px;">On this auspicious day of <strong>Kamada Ekadashi</strong>, we invite you to experience the immense spiritual benefits of service (Seva). Kamada Ekadashi is known as the fulfiller of all spiritual desires and the remover of all obstacles on the path of devotion.</p>
            
            <div style="background-color: #fff9f2; border-left: 4px solid #f7941d; padding: 15px; margin: 25px 0;">
                <p style="margin: 0; font-size: 15px;"><em>"By observing Kamada Ekadashi, even the most difficult desires are fulfilled, and one is purified of all sins."</em> — <strong>Brahmanda Purana</strong></p>
            </div>

            <h3 style="color: #8E1B3A; border-bottom: 2px solid #fce7cf; padding-bottom: 5px; margin-top: 30px;">Choose Your Seva for this Ekadashi:</h3>
            
            <div style="display: grid; gap: 20px; margin-top: 15px;">
                <div style="border: 1px solid #fce7cf; border-radius: 8px; padding: 15px; background-color: #fffaf5;">
                    <strong style="color: #d1440c; font-size: 18px;">🍲 Ekadashi Khichdi Prasad</strong>
                    <p style="font-size: 14px; margin: 5px 0;">Sponsor pure, nutritious Khichdi distribution for hundreds of devotees and visitors at ISKCON Ghaziabad.</p>
                    <a href="https://iskconghaziabad.com/donation/anna-daan" style="display: inline-block; background-color: #f7941d; color: white; padding: 8px 15px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px; margin-top: 5px;">Sponsor Khichdi</a>
                </div>

                <div style="border: 1px solid #fce7cf; border-radius: 8px; padding: 15px; background-color: #fffaf5; margin-top: 10px;">
                    <strong style="color: #d1440c; font-size: 18px;">🐄 Gau Seva (Cow Service)</strong>
                    <p style="font-size: 14px; margin: 5px 0;">Feed and serve our sacred cows. Serving cows on Ekadashi brings manifold blessings to the donor.</p>
                    <a href="https://iskconghaziabad.com/donation/gau-seva" style="display: inline-block; background-color: #f7941d; color: white; padding: 8px 15px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px; margin-top: 5px;">Offer Gau Seva</a>
                </div>

                <div style="border: 1px solid #fce7cf; border-radius: 8px; padding: 15px; background-color: #fffaf5; margin-top: 10px;">
                    <strong style="color: #d1440c; font-size: 18px;">🏛️ Guardian of Temple Plan</strong>
                    <p style="font-size: 14px; margin: 5px 0;">Become a pillar of support for the temple. Your small monthly contribution ensures the daily worship of Their Lordships continues seamlessly.</p>
                    <a href="https://iskconghaziabad.com/donation/guardian" style="display: inline-block; background-color: #8E1B3A; color: white; padding: 8px 15px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px; margin-top: 5px;">Become a Guardian</a>
                </div>
            </div>

            <p style="margin-top: 30px; text-align: center; color: #d1440c; font-weight: bold;">Chant and Be Happy:</p>
            <p style="text-align: center; font-size: 15px; background-color: #f9f9f9; padding: 15px; border-radius: 8px;">
                Hare Krishna, Hare Krishna, Krishna Krishna, Hare Hare<br>
                Hare Rama, Hare Rama, Rama Rama, Hare Hare
            </p>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 25px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee;">
            <p style="margin: 0;">© 2026 ISKCON Ghaziabad. All rights reserved.</p>
            <p style="margin: 5px 0 0;"><a href="https://iskconghaziabad.com/unsubscribe?email={{Email}}" style="color: #888; text-decoration: underline;">Unsubscribe from this list</a></p>
        </div>
    </div>
  `;

  console.log(`Checking for existing template: ${name}...`);
  const existing = await templateModel.findOne({ name }).exec();
  
  if (existing) {
    console.log('Template already exists, updating it...');
    await templateModel.findByIdAndUpdate(existing._id, { subject, htmlBody }).exec();
    console.log('✅ Template updated successfully!');
  } else {
    console.log('Creating new template...');
    const newTemplate = new templateModel({
      name,
      subject,
      htmlBody,
      isActive: true
    });
    await newTemplate.save();
    console.log('✅ Template created successfully!');
  }

  await app.close();
}

insertTemplate();
