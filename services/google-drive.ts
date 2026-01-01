// Google Drive storage service - reference: https://developers.google.com/drive
import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-drive',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Drive not connected');
  }
  return accessToken;
}

async function getGoogleDriveClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

async function getOrCreateAppFolder() {
  const drive = await getGoogleDriveClient();
  const res = await drive.files.list({
    q: "name='svobodne-cechy' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    spaces: 'drive',
    fields: 'files(id, name)',
    pageSize: 1
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  const folder = await drive.files.create({
    resource: {
      name: 'svobodne-cechy',
      mimeType: 'application/vnd.google-apps.folder'
    },
    fields: 'id'
  });

  return folder.data.id;
}

export const googleDriveStorage = {
  async saveData(userId: string, filename: string, data: any) {
    try {
      const drive = await getGoogleDriveClient();
      const folderId = await getOrCreateAppFolder();
      
      const fileMetadata = {
        name: `${userId}_${filename}`,
        parents: [folderId]
      };

      const existing = await drive.files.list({
        q: `name='${userId}_${filename}' and trashed=false`,
        spaces: 'drive',
        fields: 'files(id)',
        pageSize: 1
      });

      if (existing.data.files && existing.data.files.length > 0) {
        await drive.files.update({
          fileId: existing.data.files[0].id,
          media: {
            mimeType: 'application/json',
            body: JSON.stringify(data)
          }
        });
      } else {
        await drive.files.create({
          resource: fileMetadata,
          media: {
            mimeType: 'application/json',
            body: JSON.stringify(data)
          }
        });
      }
      return true;
    } catch (error) {
      console.error('Google Drive save error:', error);
      throw error;
    }
  },

  async loadData(userId: string, filename: string) {
    try {
      const drive = await getGoogleDriveClient();
      
      const res = await drive.files.list({
        q: `name='${userId}_${filename}' and trashed=false`,
        spaces: 'drive',
        fields: 'files(id)',
        pageSize: 1
      });

      if (!res.data.files || res.data.files.length === 0) {
        return null;
      }

      const fileId = res.data.files[0].id;
      const content = await drive.files.get({
        fileId: fileId,
        alt: 'media'
      });

      return content.data;
    } catch (error) {
      console.error('Google Drive load error:', error);
      return null;
    }
  },

  async deleteData(userId: string, filename: string) {
    try {
      const drive = await getGoogleDriveClient();
      
      const res = await drive.files.list({
        q: `name='${userId}_${filename}' and trashed=false`,
        spaces: 'drive',
        fields: 'files(id)',
        pageSize: 1
      });

      if (res.data.files && res.data.files.length > 0) {
        await drive.files.delete({
          fileId: res.data.files[0].id
        });
      }
      return true;
    } catch (error) {
      console.error('Google Drive delete error:', error);
      throw error;
    }
  }
};
