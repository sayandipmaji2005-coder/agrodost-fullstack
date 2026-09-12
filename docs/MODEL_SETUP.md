# Disease Diagnosis & Inference Service Guide

AgriCare's crop disease inference layer is cleanly decoupled via the `IInferenceProvider` interface located in `server/src/services/diagnosis.service.ts`.

---

## 1. Built-in Diagnostic Knowledge Engine
Out of the box, AgriCare incorporates a rigorous phytopathology knowledge base covering primary Indian staple crops:
- **Potato**: Late Blight (*Phytophthora infestans*), Early Blight (*Alternaria solani*), Black Scurf.
- **Rice**: Rice Blast (*Magnaporthe oryzae*), Bacterial Leaf Blight (*Xanthomonas oryzae*), Brown Spot.
- **Tomato**: Tomato Leaf Curl Virus, Early Blight, Bacterial Spot.
- **Wheat**: Yellow/Stripe Rust (*Puccinia striiformis*), Leaf Rust, Powdery Mildew.
- **Maize**: Fall Armyworm damage, Turcicum Leaf Blight.
- **Cotton**: Cotton Leaf Curl Virus, Bacterial Blight.

For each condition, AgriCare returns:
- Confirmed symptoms
- Environmental root causes
- Non-chemical cultural management
- Biological controls (e.g., *Trichoderma viride*, *Pseudomonas fluorescens*, Neem oil extracts)
- Standard active chemical ingredient categories (e.g., *Mancozeb 75% WP*, *Copper Oxychloride 50% WP*, *Tebuconazole 25.9% EC*)

---

## 2. Low-Confidence & Non-Crop Rejection
- Images scoring under **60% confidence** or displaying non-leaf content trigger the fallback state.
- Farmers are given direct access to:
  * **Kisan Call Centre**: `1800-180-1551`
  * Nearest Krishi Vigyan Kendra (KVK) advisory guidelines.

---

## 3. Connecting a Custom Machine Learning Model
To route inference through a dedicated PyTorch / TensorFlow / FastAPI microservice:
```env
CROP_DIAGNOSTICS_API_ENDPOINT=https://your-ml-cluster.example.com/v1/diagnose
CROP_DIAGNOSTICS_API_KEY=your-api-key
```
The server will POST the multipart image payload to your endpoint and parse the standard schema.
