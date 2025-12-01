// Shim: expo-three, three/examples/js yolunu beklediğinde Metro alias ile JSM sürümünü yükler
// ve THREE.STLLoader referansını sağlar.
// Bu dosyayı uygulama girişinde bir kez import edin.

import * as THREE from 'three';
// JSM modülünü yan etki için import et (global THREE içine sınıf eklemez)
// Bu yüzden manuel atama yapıyoruz.
// @ts-ignore - type exportları farklılık gösterebilir
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

// @ts-ignore: runtime atama
(THREE as any).STLLoader = STLLoader;

export {}; // side-effect only


