import http from "k6/http";
import { sleep, check } from "k6";

export let options = {
  stages: [
    { duration: "30s", target: 200 },   // kullanıcı artışı
    { duration: "1m", target: 500 },    // normal trafik
    { duration: "30s", target: 1000 },  // basınç testi
    { duration: "1m", target: 1000 },   // stabilizasyon
    { duration: "30s", target: 0 },     // yavaşlatma
  ],
  thresholds: {
    http_req_duration: ["p(95)<600"],    // %95 istek 600ms altı olmalı
    http_req_failed: ["rate<0.01"],      // hata oranı %1'den düşük olmalı
  },
};

const BASE_URL = "https://api.huglutekstil.com/api";
const API_KEY = "huglu_1f3a9b6c2e8d4f0a7b1c3d5e9f2468ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f";  // --> buraya gerçek key gelecek

export default function () {
  // Giriş isteği (auth)
  let login = http.post(`${BASE_URL}/auth/login`, {
    email: "test@test.com",
    password: "123456",
  });

  check(login, {
    "Login başarılı": (res) => res.status === 200,
  });

  const token = login.json("token");

  // Tüm isteklerde kullanılacak header
  let headers = {
    Authorization: `Bearer ${token}`,
    "x-api-key": API_KEY,
    "Content-Type": "application/json",
  };

  // Ürün listeleme
  let products = http.get(`${BASE_URL}/products?page=1&limit=20`, { headers });

  check(products, {
    "Ürünler geldi": (res) => res.status === 200,
  });

  const productId = products.json("items[0].id");

  // Sepete ekleme
  let cart = http.post(
    `${BASE_URL}/cart/add`,
    JSON.stringify({ product_id: productId, quantity: 1 }),
    { headers }
  );

  check(cart, {
    "Sepete eklendi": (res) => res.status === 200,
  });

  // Sipariş oluşturma (mock)
  let order = http.post(
    `${BASE_URL}/order`,
    JSON.stringify({ payment: "TEST_MODE", shipping: "EXPRESS" }),
    { headers }
  );

  check(order, {
    "Sipariş başarılı": (res) => res.status === 200 || res.status === 201,
  });

  sleep(1);
}
