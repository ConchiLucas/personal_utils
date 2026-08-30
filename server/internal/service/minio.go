package service

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/url"
	"os"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type MinioService struct {
	Client     *minio.Client
	BucketName string
	Endpoint   string
}

var GlobalMinio *MinioService

func InitMinio() (*MinioService, error) {
	endpoint := os.Getenv("MINIO_ENDPOINT")
	if endpoint == "" {
		endpoint = "127.0.0.1:19100"
	}

	accessKey := os.Getenv("MINIO_ACCESS_KEY")
	if accessKey == "" {
		accessKey = "conchi"
	}

	secretKey := os.Getenv("MINIO_SECRET_KEY")
	if secretKey == "" {
		secretKey = "conchi123456"
	}

	bucketName := os.Getenv("MINIO_BUCKET")
	if bucketName == "" {
		bucketName = "personal-files"
	}

	// Initialize MinIO client
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: false,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create MinIO client: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Ensure bucket exists
	exists, err := client.BucketExists(ctx, bucketName)
	if err != nil {
		log.Printf("[MinIO] Warning checking bucket %s: %v", bucketName, err)
	} else if !exists {
		err = client.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{})
		if err != nil {
			log.Printf("[MinIO] Warning creating bucket %s: %v", bucketName, err)
		} else {
			log.Printf("[MinIO] Created bucket %s successfully", bucketName)
		}
	}

	svc := &MinioService{
		Client:     client,
		BucketName: bucketName,
		Endpoint:   endpoint,
	}
	GlobalMinio = svc
	log.Printf("[MinIO] Connected to MinIO at %s (Bucket: %s)", endpoint, bucketName)
	return svc, nil
}

func (s *MinioService) Upload(ctx context.Context, objectKey string, reader io.Reader, size int64, contentType string) error {
	_, err := s.Client.PutObject(ctx, s.BucketName, objectKey, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	return err
}

func (s *MinioService) Delete(ctx context.Context, objectKey string) error {
	return s.Client.RemoveObject(ctx, s.BucketName, objectKey, minio.RemoveObjectOptions{})
}

func (s *MinioService) GetObject(ctx context.Context, objectKey string) (*minio.Object, error) {
	return s.Client.GetObject(ctx, s.BucketName, objectKey, minio.GetObjectOptions{})
}

func (s *MinioService) GetPresignedURL(ctx context.Context, objectKey string, expiry time.Duration) (string, error) {
	reqParams := make(url.Values)
	presignedURL, err := s.Client.PresignedGetObject(ctx, s.BucketName, objectKey, expiry, reqParams)
	if err != nil {
		return "", err
	}
	return presignedURL.String(), nil
}
