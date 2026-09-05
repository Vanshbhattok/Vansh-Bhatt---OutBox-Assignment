import { Request, Response } from 'express';
import { prisma } from '../database/prisma';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config';

const googleClient = new OAuth2Client(config.googleClientId);

export const googleAuthLogin = async (req: Request, res: Response) => {
  try {
    const { credential, email, name, avatar, googleId } = req.body;

    let userEmail = email;
    let userName = name;
    let userAvatar = avatar;
    let userGoogleId = googleId;

    // Verify Google OAuth ID token if credential JWT string is provided
    if (credential && config.googleClientId) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: config.googleClientId,
        });
        const payload = ticket.getPayload();
        if (payload) {
          userEmail = payload.email || userEmail;
          userName = payload.name || userName;
          userAvatar = payload.picture || userAvatar;
          userGoogleId = payload.sub || userGoogleId;
        }
      } catch (e) {
        console.warn('[Auth] Google ID token verification warning, using payload fallbacks:', (e as Error).message);
      }
    }

    if (!userEmail) {
      return res.status(400).json({ error: 'Email address is required for authentication.' });
    }

    // Upsert User in database
    const user = await prisma.user.upsert({
      where: { email: userEmail },
      update: {
        name: userName || userEmail.split('@')[0],
        avatar: userAvatar,
        googleId: userGoogleId,
      },
      create: {
        email: userEmail,
        name: userName || userEmail.split('@')[0],
        avatar: userAvatar,
        googleId: userGoogleId,
      },
    });

    return res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        slackWebhookUrl: user.slackWebhookUrl,
      },
    });
  } catch (err) {
    console.error('[Auth Controller Error]:', err);
    return res.status(500).json({ error: 'Failed to process Google authentication.' });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const { email } = req.query;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'User email query parameter is required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
};
