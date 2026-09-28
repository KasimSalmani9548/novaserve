import { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { api } from '../../lib/api';
import { Card, Btn, Input, Label, Spinner, Empty, Badge, formatDate } from '../../components/ui';
import { FileUp, Download, CheckCircle, AlertCircle, FileText, Lock, Eye, EyeOff, Sun } from 'lucide-react';

const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
const FRONT_CROP = { left: 8, top: 72.5, right: 49, bottom: 92.5 };
const BACK_CROP = { left: 51, top: 72.5, right: 92, bottom: 92.5 };

export function AadhaarPvc() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [frontImg, setFrontImg] = useState<string | null>(null);
  const [backImg, setBackImg] = useState<string | null>(null);
  const [a4PdfUrl, setA4PdfUrl] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [charge, setCharge] = useState(141);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [showPasswordPopup, setShowPasswordPopup] = useState(false);
  const [popupPassword, setPopupPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [popupErr, setPopupErr] = useState('');
  const popupInputRef = useRef<HTMLInputElement>(null);
  const savedPdfRef = useRef<any>(null);

  useEffect(() => {
    api.get('/settings/public').then((s: any) => setCharge(s.aadhaarPvcCharge || 141)).catch(() => {});
    api.get('/aadhaar-pvc/requests').then((d) => setHistory(Array.isArray(d) ? d : [])).finally(() => setLoadingHistory(false));
  }, []);

  const validateAadhaarPdf = async (pdf: any): Promise<boolean> => {
    try {
      const page = await pdf.getPage(1);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((i: any) => i.str || '').join(' ').toLowerCase();
      const keywords = ['aadhaar', 'aadhar', 'uidai', 'government of india', 'vid', 'unique identification'];
      return keywords.some((k) => text.includes(k));
    } catch {
      return false;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setErr(''); setFrontImg(null); setBackImg(null); setA4PdfUrl(null); setSuccess(false);
    setBrightness(100); setContrast(100);
    if (acceptedFiles.length === 0) return;
    const f = acceptedFiles[0];
    if (f.type !== 'application/pdf') { setErr('Only PDF files are accepted'); return; }
    if (f.size > 5 * 1024 * 1024) { setErr('File size must be under 5 MB'); return; }
    setFile(f);

    try {
      const pdfjsLib: any = await import(/* @vite-ignore */ PDFJS_URL);
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      const arrayBuffer = await f.arrayBuffer();
      try {
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const valid = await validateAadhaarPdf(pdf);
        if (!valid) {
          setErr('This does not look like an Aadhaar PDF. Please upload only original UIDAI e-Aadhaar PDF.');
          setFile(null);
        }
      } catch (e: any) {
        if (e.name === 'PasswordException' || (e.message && e.message.includes('password'))) {
          setPopupPassword(''); setPopupErr(''); setShowPasswordPopup(true);
          setTimeout(() => popupInputRef.current?.focus(), 100);
        }
      }
    } catch {}
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  });

  const cropCanvas = (canvas: HTMLCanvasElement, crop: any, bright = 100, cont = 100): string => {
    const W = canvas.width;
    const H = canvas.height;
    const sx = Math.floor((crop.left / 100) * W);
    const sy = Math.floor((crop.top / 100) * H);
    const sw = Math.floor(((crop.right - crop.left) / 100) * W);
    const sh = Math.floor(((crop.bottom - crop.top) / 100) * H);
    const out = document.createElement('canvas');
    out.width = sw; out.height = sh;
    const ctx = out.getContext('2d')!;
    ctx.filter = 'brightness(' + bright + '%) contrast(' + cont + '%)';
    ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
    ctx.filter = 'none';
    return out.toDataURL('image/png', 1.0);
  };

  const buildA4Pdf = async (frontDataUrl: string, backDataUrl: string): Promise<string> => {
    const mod = await import('jspdf');
    const pdf = new mod.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const cardW = 85.6; const cardH = 54; const gap = 3;
    const totalW = cardW * 2 + gap;
    const startX = (210 - totalW) / 2;
    const startY = 15;
    pdf.addImage(frontDataUrl, 'PNG', startX, startY, cardW, cardH);
    pdf.addImage(backDataUrl, 'PNG', startX + cardW + gap, startY, cardW, cardH);
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    pdf.rect(startX, startY, cardW, cardH);
    pdf.rect(startX + cardW + gap, startY, cardW, cardH);
    return pdf.output('dataurlstring');
  };

  const applyAdjustments = async (bright: number, cont: number) => {
    if (!savedPdfRef.current) return;
    setBusy(true);
    try {
      const c1 = savedPdfRef.current;
      const frontCrop = cropCanvas(c1, FRONT_CROP, bright, cont);
      const backCrop = cropCanvas(c1, BACK_CROP, bright, cont);
      setFrontImg(frontCrop);
      setBackImg(backCrop);
      const a4Pdf = await buildA4Pdf(frontCrop, backCrop);
      setA4PdfUrl(a4Pdf);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const finalizePdf = async (pdf: any) => {
    const valid = await validateAadhaarPdf(pdf);
    if (!valid) throw new Error('This does not look like an Aadhaar PDF. Please upload only original UIDAI e-Aadhaar PDF.');

    const p1 = await pdf.getPage(1);
    const v1 = p1.getViewport({ scale: 3 });
    const c1 = document.createElement('canvas');
    c1.width = v1.width; c1.height = v1.height;
    await p1.render({ canvasContext: c1.getContext('2d')!, viewport: v1 }).promise;
    savedPdfRef.current = c1;

    const frontCrop = cropCanvas(c1, FRONT_CROP, brightness, contrast);
    const backCrop = cropCanvas(c1, BACK_CROP, brightness, contrast);
    setFrontImg(frontCrop);
    setBackImg(backCrop);

    const a4Pdf = await buildA4Pdf(frontCrop, backCrop);
    setA4PdfUrl(a4Pdf);

    // Charge wallet + create order
    try {
      await api.post('/aadhaar-pvc/request', { fileName: file!.name });
    } catch (e: any) {
      setErr('Warning: Order saved but wallet notification failed.');
    }

    setSuccess(true);
    // Do NOT refresh history here to avoid page reload
    api.get('/aadhaar-pvc/requests').then((d) => {
      if (Array.isArray(d)) setHistory(d);
    }).catch(() => {});
  };

  const processPdf = async () => {
    if (!file) { setErr('Please upload an Aadhaar PDF'); return; }
    setErr(''); setBusy(true);
    try {
      const pdfjsLib: any = await import(/* @vite-ignore */ PDFJS_URL);
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      const arrayBuffer = await file.arrayBuffer();
      try {
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        await finalizePdf(pdf);
      } catch (e: any) {
        if (e.name === 'PasswordException' || (e.message && e.message.includes('password'))) {
          setBusy(false);
          setPopupPassword(''); setPopupErr(''); setShowPasswordPopup(true);
          setTimeout(() => popupInputRef.current?.focus(), 100);
          return;
        }
        throw new Error('Could not open PDF. Make sure it is a valid UIDAI e-Aadhaar PDF.');
      }
    } catch (e: any) {
      setErr(e.message || 'Failed to process PDF.');
      setBusy(false);
    }
  };

  const unlockWithPassword = async () => {
    if (!file) return;
    if (!popupPassword || popupPassword.length < 4) { setPopupErr('Please enter the PDF password'); return; }
    setPopupErr(''); setBusy(true);
    try {
      const pdfjsLib: any = await import(/* @vite-ignore */ PDFJS_URL);
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      const arrayBuffer = await file.arrayBuffer();
      let pdf: any;
      try {
        pdf = await pdfjsLib.getDocument({ data: arrayBuffer, password: popupPassword }).promise;
      } catch {
        throw new Error('Wrong password. Use first 4 letters of name (CAPITAL) + birth year.');
      }
      await finalizePdf(pdf);
      setShowPasswordPopup(false);
      setPopupPassword('');
    } catch (e: any) {
      setPopupErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const downloadUrl = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const reset = () => {
    setFile(null); setFrontImg(null); setBackImg(null); setA4PdfUrl(null);
    setSuccess(false); setErr(''); setBrightness(100); setContrast(100);
    savedPdfRef.current = null;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Aadhaar PVC Print</h1>
        <p className="text-sm text-slate-500 mt-1">Upload your UIDAI e-Aadhaar PDF - get print-ready PVC cards</p>
      </div>

      <Card className="p-4 border-amber-500/30 bg-amber-500/5">
        <div className="flex gap-2">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200 leading-relaxed">
            <p className="font-bold mb-1">Important Notice</p>
            <p>Upload only the original e-Aadhaar PDF from myaadhaar.uidai.gov.in. Other PDFs will be rejected.</p>
          </div>
        </div>
      </Card>

      {!success && (
        <Card className="p-6 space-y-5">
          <div {...getRootProps()} className={'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ' + (isDragActive ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-700 hover:border-slate-600')}>
            <input {...getInputProps()} />
            <FileUp className="w-12 h-12 mx-auto text-slate-500 mb-3" />
            {file ? (
              <div>
                <p className="text-sm text-slate-200 font-medium">{file.name}</p>
                <p className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB - click to change</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-200 font-medium">{isDragActive ? 'Drop the PDF here' : 'Drop Aadhaar PDF file here'}</p>
                <p className="text-xs text-slate-500 mt-1">Click to browse - PDF only, max 5 MB</p>
              </div>
            )}
          </div>

          {err && <p className="text-red-400 text-sm">{err}</p>}

          <div className="flex gap-2">
            <Btn variant="secondary" onClick={reset} disabled={busy}>Reset</Btn>
            <Btn onClick={processPdf} disabled={busy || !file} className="flex-1">
              {busy ? 'Processing...' : 'Generate PVC Card - Pay Rs ' + charge}
            </Btn>
          </div>
        </Card>
      )}

      {success && frontImg && backImg && (
        <Card className="p-5 space-y-4">
          <h3 className="font-semibold text-slate-100 flex items-center gap-2">
            <Sun className="w-4 h-4" /> Photo Adjustment
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Brightness: {brightness}%</Label>
              <input
                type="range" min="100" max="150" value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                onMouseUp={() => applyAdjustments(brightness, contrast)}
                onTouchEnd={() => applyAdjustments(brightness, contrast)}
                className="w-full accent-emerald-500"
              />
            </div>
            <div>
              <Label>Contrast: {contrast}%</Label>
              <input
                type="range" min="100" max="150" value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                onMouseUp={() => applyAdjustments(brightness, contrast)}
                onTouchEnd={() => applyAdjustments(brightness, contrast)}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>

          {busy && <p className="text-xs text-slate-500 text-center">Applying...</p>}
        </Card>
      )}

      {success && frontImg && backImg && a4PdfUrl && (
        <Card className="p-6 space-y-5 border-emerald-500/30">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-emerald-400" />
            <div>
              <p className="font-bold text-emerald-400">Aadhaar Card Generated Successfully!</p>
              <p className="text-xs text-slate-400">Rs {charge} deducted.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-2">FRONT SIDE</p>
              <div className="bg-white rounded-lg overflow-hidden border border-slate-800">
                <img src={frontImg} alt="Aadhaar Front" className="w-full h-auto" />
              </div>
              <Btn onClick={() => downloadUrl(frontImg, 'aadhaar-front.png')} variant="secondary" className="w-full mt-2">
                <Download className="w-4 h-4 inline mr-2" /> Download Front
              </Btn>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-2">BACK SIDE</p>
              <div className="bg-white rounded-lg overflow-hidden border border-slate-800">
                <img src={backImg} alt="Aadhaar Back" className="w-full h-auto" />
              </div>
              <Btn onClick={() => downloadUrl(backImg, 'aadhaar-back.png')} variant="secondary" className="w-full mt-2">
                <Download className="w-4 h-4 inline mr-2" /> Download Back
              </Btn>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>A4 Print Format (Front + Back side by side)</span>
            </div>
            <Btn onClick={() => downloadUrl(a4PdfUrl, 'aadhaar-pvc-output.pdf')} className="w-full">
              <Download className="w-4 h-4 inline mr-2" /> Download A4 PDF
            </Btn>
          </div>

          <div className="flex justify-center">
            <Btn variant="secondary" onClick={reset}>Upload Another PDF</Btn>
          </div>
        </Card>
      )}

      <Card>
        <div className="p-4 border-b border-slate-800">
          <h2 className="font-semibold text-slate-100">My Aadhaar PVC Requests</h2>
        </div>
        {loadingHistory ? <div className="p-6 flex justify-center"><Spinner className="text-emerald-500" /></div>
          : history.length === 0 ? <Empty title="No PVC cards yet" />
          : (
            <ul className="divide-y divide-slate-800">
              {history.map((h) => (
                <li key={h.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-slate-200 font-medium">{h.fileName}</p>
                    <p className="text-xs text-slate-500 font-mono">Order: {h.orderId}</p>
                    <p className="text-xs text-slate-500">{formatDate(h.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <Badge tone="green">{h.status}</Badge>
                    <p className="text-xs text-slate-500 mt-1">Rs {h.charge}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </Card>

      {showPasswordPopup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowPasswordPopup(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Lock className="w-7 h-7 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-100">Protected e-Aadhaar PDF</h2>
              <p className="text-sm text-slate-400 mt-1">Enter your PDF password to unlock:</p>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
              <p className="text-xs text-amber-300 font-semibold mb-1">Aadhaar Password Format Hint:</p>
              <p className="text-xs text-amber-200">First 4 letters of Name in CAPITAL + Birth Year (YYYY)</p>
              <p className="text-xs text-amber-200 mt-1">Example: Name = <strong>RAMESH</strong>, DOB = <strong>1990</strong> → Password = <strong>RAME1990</strong></p>
            </div>

            <div className="relative mb-3">
              <Input
                ref={popupInputRef}
                type={showPassword ? 'text' : 'password'}
                value={popupPassword}
                onChange={(e) => setPopupPassword(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === 'Enter') unlockWithPassword(); }}
                placeholder="Enter Password (e.g. RAME1990)"
                className="font-mono pr-10"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {popupErr && <p className="text-red-400 text-sm mb-3">{popupErr}</p>}

            <Btn onClick={unlockWithPassword} disabled={busy || !popupPassword} className="w-full">
              <Lock className="w-4 h-4 inline mr-2" />
              {busy ? 'Unlocking...' : 'Unlock & Open PDF'}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
