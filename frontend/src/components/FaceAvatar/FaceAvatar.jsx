import './FaceAvatar.css';
import normalEyes from '../../res/eyes/normal.png';
import happyEyes from '../../res/eyes/happy.png';
import joyEyes from '../../res/eyes/joy.png';
import sadEyes from '../../res/eyes/sad.png';
import verySadEyes from '../../res/eyes/very_sad.png';
import cryingEyes from '../../res/eyes/crying.png';
import uwuEyes from '../../res/eyes/uwu.png';
import cuteEyes from '../../res/eyes/cute.png';
import loveEyes from '../../res/eyes/love.png';
import blinkEyes from '../../res/eyes/blink.png';
import closeEyes from '../../res/eyes/close.png';
import softEyes from '../../res/eyes/soft.png';
import dizzyEyes from '../../res/eyes/dizzy.png';
import fearEyes from '../../res/eyes/fear.png';
import coldFearEyes from '../../res/eyes/cold_fear.png';
import panicEyes from '../../res/eyes/panic.png';
import deadEyes from '../../res/eyes/dead.png';
import uwuMouth from '../../res/mouth/uwu.png';
import neutralMouth from '../../res/mouth/neutral.png';
import smileMouth from '../../res/mouth/smile.png';
import notSmileMouth from '../../res/mouth/not_smile.png';
import laugthMouth from '../../res/mouth/laugth.png';
import sadMouth from '../../res/mouth/sad.png';
import openMouth from '../../res/mouth/open.png';
import kissMouth from '../../res/mouth/kiss.png';
import scaredMouth from '../../res/mouth/scared.png';
import screamMouth from '../../res/mouth/scream.png';
import horrifiedMouth from '../../res/mouth/horrified.png';

function FaceAvatar({ faceConfig, size = 'medium' }) {
  const {
    skinColor,
    eyeType,
    mouthType,
  } = faceConfig;

  const eyeImages = {
    normal: normalEyes,
    happy: happyEyes,
    joy: joyEyes,
    sad: sadEyes,
    very_sad: verySadEyes,
    crying: cryingEyes,
    uwu: uwuEyes,
    cute: cuteEyes,
    love: loveEyes,
    blink: blinkEyes,
    close: closeEyes,
    soft: softEyes,
    dizzy: dizzyEyes,
    fear: fearEyes,
    cold_fear: coldFearEyes,
    panic: panicEyes,
    dead: deadEyes,
  };

  const mouthImages = {
    uwu: uwuMouth,
    neutral: neutralMouth,
    smile: smileMouth,
    not_smile: notSmileMouth,
    laugth: laugthMouth,
    sad: sadMouth,
    open: openMouth,
    kiss: kissMouth,
    scared: scaredMouth,
    scream: screamMouth,
    horrified: horrifiedMouth,
  };

  const isImageEye = eyeImages[eyeType];

  return (
    <div className={`face-avatar face-${size}`}>
      <div className="face-circle" style={{ backgroundColor: skinColor }}>

        {/* Eyes */}
        {isImageEye ? (
          <div className="eyes">
            <img src={eyeImages[eyeType]} alt={`${eyeType} eyes`} className={`eye-image eye-${eyeType}`} />
          </div>
        ) : (
          <div className="eyes">
            <div className={`eye eye-${eyeType}`}></div>
            <div className={`eye eye-${eyeType}`}></div>
          </div>
        )}

        {/* Mouth */}
        <div className="mouth-container">
          <img src={mouthImages[mouthType]} alt="mouth" className={`mouth-image mouth-${mouthType}`} />
        </div>
      </div>
    </div>
  );
}

export default FaceAvatar;
