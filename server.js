// 환경변수 로드
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('.'));

// Replicate API 키 (환경변수에서만 가져오기)
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || "r8_eGYbNhPuO1569X9nyV3O8m06GSNRUos4J1Q87";
if (!REPLICATE_API_TOKEN) {
  console.error('❌ REPLICATE_API_TOKEN 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

// Cloudinary 환경설정
cloudinary.config({
  cloud_name: 'dwt9va79z',
  api_key: '341829715538849',
  api_secret: 'ftBZn-S__Au9rojUfvNAfJQE5oY'
});

// 이미지 업로드 엔드포인트 (Cloudinary 사용)
app.post('/upload', async (req, res) => {
  // 성능 측정 시작
  const startTime = Date.now();
  
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: '이미지 데이터가 없습니다.' });
    }

    // 이미지 크기 계산 (대략적인 크기)
    const imageSizeKB = Math.round((image.length * 3) / 4 / 1024);
    console.log(`📊 업로드 시작 - 이미지 크기: ${imageSizeKB}KB`);

    // base64 데이터를 data URI로 변환
    const dataUri = `data:image/png;base64,${image}`;
    
    // Cloudinary 업로드 시작 시간
    const uploadStartTime = Date.now();
    
    // Cloudinary에 업로드
    const uploadRes = await cloudinary.uploader.upload(dataUri, {
      folder: 'ai-styling',
      resource_type: 'image'
    });

    // 업로드 완료 시간 측정
    const uploadEndTime = Date.now();
    const uploadDuration = uploadEndTime - uploadStartTime;
    const totalDuration = uploadEndTime - startTime;

    console.log(`⚡ Cloudinary 업로드 완료:`);
    console.log(`   - 업로드 시간: ${uploadDuration}ms`);
    console.log(`   - 총 처리 시간: ${totalDuration}ms`);
    console.log(`   - 업로드 속도: ${(imageSizeKB / (uploadDuration / 1000)).toFixed(2)} KB/s`);
    console.log(`   - 파일 URL: ${uploadRes.secure_url}`);

    if (uploadRes && uploadRes.secure_url) {
      res.json({ 
        url: uploadRes.secure_url,
        // 성능 정보 추가
        performance: {
          uploadTime: uploadDuration,
          totalTime: totalDuration,
          imageSizeKB: imageSizeKB,
          uploadSpeedKBps: Math.round(imageSizeKB / (uploadDuration / 1000))
        }
      });
    } else {
      res.status(500).json({ 
        error: 'Cloudinary 업로드 실패', 
        details: uploadRes 
      });
    }
  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error(`❌ 업로드 오류 (${errorTime}ms):`, error);
    res.status(500).json({ 
      error: '이미지 업로드 중 오류가 발생했습니다.',
      details: error.message,
      errorTime: errorTime
    });
  }
});

// Replicate API 호출 엔드포인트
app.post('/replicate', async (req, res) => {
  try {
    // 2초 대기 (안정성을 위해)
    await new Promise(resolve => setTimeout(resolve, 2000));

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    console.log('Replicate 예측 생성:', JSON.stringify(data, null, 2));
    res.json(data);
  } catch (error) {
    console.error('Replicate API 오류:', error);
    res.status(500).json({ 
      error: 'AI 이미지 생성 중 오류가 발생했습니다.',
      details: error.message 
    });
  }
});

// Replicate 결과 polling 엔드포인트
app.get('/replicate/:id', async (req, res) => {
  try {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${req.params.id}`, {
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`
      }
    });

    const data = await response.json();
    console.log('Replicate 결과 폴링:', JSON.stringify(data, null, 2));
    res.json(data);
  } catch (error) {
    console.error('Replicate 폴링 오류:', error);
    res.status(500).json({ 
      error: '결과 확인 중 오류가 발생했습니다.',
      details: error.message 
    });
  }
});

// 메인 페이지 라우트
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 갤러리 페이지 라우트 (있는 경우)
app.get('/gallery', (req, res) => {
  const galleryPath = path.join(__dirname, 'gallery.html');
  if (require('fs').existsSync(galleryPath)) {
    res.sendFile(galleryPath);
  } else {
    res.redirect('/');
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log('🚀 AI Fitting Studio 서버가 포트', PORT, '에서 실행 중입니다.');
  console.log('📱 브라우저에서 http://localhost:' + PORT + ' 를 열어보세요.');
  
  console.log('✅ Replicate API 토큰이 설정되었습니다.');
  
  console.log('✅ Cloudinary가 설정되었습니다.');
}); 