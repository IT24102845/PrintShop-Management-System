// ============================================================
// STORAGE SERVICE - FRONTEND
// Purpose: Handles artwork file validation and upload to Supabase Storage bucket.
// Flow: UI Component -> File Validation -> Supabase Storage Upload -> URL Returned
// This service handles client-side file uploads and storage communication.
// ============================================================

// =============================================================================
// PrintShop Management System — Angular Supabase Storage Service
// =============================================================================
// File Upload & Asset Pipeline:
//   1. Client-side File Validation:
//      - Allowed formats: PDF, PNG, JPG/JPEG, SVG, Adobe Illustrator (.ai), Photoshop (.psd).
//      - File size limit: 20 MB maximum per upload.
//   2. Path Sanitization & Collision Prevention:
//      - Filenames are sanitized by replacing non-alphanumeric characters with underscores.
//      - Timestamps are prefixed to guarantee uniqueness: '${folder}/${timestamp}_${safeName}'.
//   3. Direct Supabase Storage REST Uploads:
//      - Files are uploaded directly to the Supabase Storage bucket via POST
//        to '/storage/v1/object/${bucket}/${filePath}' using the anon key.
//   4. Real-time Progress Tracking:
//      - Uses Angular HttpClient HttpRequest with 'reportProgress: true' to compute
//        percentage completion and stream updates to UI progress bars.
//   5. Public Asset URL Resolution:
//      - Resolves permanent CDN URLs: '/storage/v1/object/public/${bucket}/${filePath}'.
// =============================================================================

import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpRequest, HttpEventType, HttpResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UploadResult {
  url: string;
  path: string;
  name: string;
}

export interface UploadProgress {
  percent: number;
  done: boolean;
  result?: UploadResult;
  error?: string;
}

const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  // AI and PSD may be detected as octet-stream in some browsers
  'application/postscript',
  'image/vnd.adobe.photoshop',
  'application/octet-stream',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.svg', '.ai', '.psd'];
const MAX_FILE_SIZE_MB   = 20;

@Injectable({ providedIn: 'root' })
export class StorageService {
  /** Reactive upload progress signal — useful for components */
  public uploadProgress = signal<number>(0);
  public isUploading    = signal<boolean>(false);

  private readonly bucket = environment.supabaseStorageBucket;

  constructor(private http: HttpClient) {}

  // ─── Validation ─────────────────────────────────────────────────────────────

  validateFile(file: File): string | null {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `File type not allowed. Accepted: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_FILE_SIZE_MB) {
      return `File is too large (${sizeMB.toFixed(1)} MB). Maximum is ${MAX_FILE_SIZE_MB} MB.`;
    }
    return null;
  }

  // ─── Upload via Supabase REST API ─────────────────────────────────────────

  /**
   * Uploads a file directly to Supabase Storage using the anon key.
   * Returns the public URL of the uploaded file.
   *
   * Prerequisites:
   *  1. Create a bucket named (environment.supabaseStorageBucket) in Supabase.
   *  2. Enable public access on the bucket, OR use a signed URL approach.
   *  3. Fill in supabaseUrl and supabaseAnonKey in environment.ts.
   */
  uploadFile(file: File, folder = 'orders'): Observable<UploadProgress> {
    const validationError = this.validateFile(file);
    if (validationError) return throwError(() => new Error(validationError));

    const timestamp  = Date.now();
    const safeName   = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath   = `${folder}/${timestamp}_${safeName}`;
    const uploadUrl  = `${environment.supabaseUrl}/storage/v1/object/${this.bucket}/${filePath}`;

    const req = new HttpRequest('POST', uploadUrl, file, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${environment.supabaseAnonKey}`,
        'apikey': environment.supabaseAnonKey,
        'x-upsert': 'true',
      }),
      reportProgress: true,
    });

    return new Observable<UploadProgress>(observer => {
      this.isUploading.set(true);
      this.uploadProgress.set(0);

      this.http.request(req).subscribe({
        next: event => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            const percent = Math.round(100 * event.loaded / event.total);
            this.uploadProgress.set(percent);
            observer.next({ percent, done: false });
          }
          if (event instanceof HttpResponse && event.status >= 200 && event.status < 300) {
            const publicUrl = `${environment.supabaseUrl}/storage/v1/object/public/${this.bucket}/${filePath}`;
            this.isUploading.set(false);
            this.uploadProgress.set(100);
            observer.next({ percent: 100, done: true, result: { url: publicUrl, path: filePath, name: file.name } });
            observer.complete();
          }
        },

        error: err => {
          this.isUploading.set(false);
          observer.error(err);
        },
      });
    });
  }

  /** Returns whether a file extension is an image (for preview) */
  isImage(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    return ['png', 'jpg', 'jpeg', 'svg'].includes(ext);
  }
}
