// Code for indexing is ram intensive if you wish to run yourself
// Some pages may hang for archiving DO NOT CLOSE THE PAGE!!
// ALLOW POPUPS!!!!
const archiveList = [];
zipper = document.createElement("script");
zipper.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
zipper.addEventListener("load", appendList.bind(this, "https://consumerrights.wiki/index.php?title=Special:AllPages&hideredirects=1", 1));
document.head.appendChild(zipper);
function appendList(url, index) {
    makePuppet(url)
        .then(puppet => {
            let doc = puppet.document;
            let part = doc.body.querySelectorAll(".mw-allpages-chunk li a");
            if (part.length > 0) {
                archiveList.push(...part);
            }
            let dopts = doc.body.querySelectorAll(".mw-allpages-nav a");
            let options = dopts.length;
            puppet.window.close();
            if (index > 1 && options === 4 || index === 1) {
                for (let opt of dopts) {
                    if (opt.innerText.includes("Next page")) {
                        appendList(opt.href, ++index);
                        break;
                    }
                }
            } else {
                makePageBuffers(0);
            }
        })
}

const archiveBlobs = [];

function makePageBuffers(index) {
    makePuppet(archiveList[index])
        .then(puppet => {
            const doc = puppet.document;
            const win = puppet.window;
            // set custom dimensions using wxh [] or use 'b4' for best printing
            // also add [10, 0, 10, 0] so that there are page margins
            const format = [win.innerWidth, doc.body.scrollHeight];
            doc.querySelector("html").style['scrollbar-width'] = "none";
            doc.body.querySelector(".vector-page-toolbar").remove();
            doc.body.querySelector(".mw-body-header > nav:nth-child(1)")?.remove();
            pdfSrc = doc.createElement("script");
            pdfSrc.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
            pdfSrc.addEventListener("load", () => {
                win.gotBlob = function (blob) {
                    archiveBlobs.push({ title: encodeURIComponent(doc.title) + ".pdf", data: blob });
                    if (index < archiveList.length - 1) {
                        makePageBuffers(++index);
                    } else {
                        let zip = new JSZip();
                        for (let blob of archiveBlobs) {
                            zip.file(blob.title, blob.data);
                        }
                        zip.generateAsync({ type: "blob" })
                            .then(mime => {
                                const file = document.createElement("a");
                                const url = URL.createObjectURL(mime);
                                file.download = "CRW_" + Date().slice(0, 33);
                                file.href = url;
                                file.style.display = "hidden"
                                document.body.appendChild(file);
                                file.click();
                                document.body.removeChild(file);
                            })
                    }
                    win.close();
                }
                let src = doc.createElement("script");
                src.innerHTML = `
                const worker = html2pdf();
                worker.set({
                    margin: [0, 0, 0, 0], //top, left, buttom, right,
                    image: { type: 'jpeg', quality: 0.7 },
                    html2canvas: { dpi: 192, letterRendering: true },
                    jsPDF: { unit: 'px', format: [${format[0]}, ${format[1]}], orientation: 'portrait' },
                    pagebreak: { mode: 'avoid-all' }
                })
                    .from(document.body.querySelector(".mw-page-container"))
                    .toPdf()
                    .output("blob")
                    .then(data => {
                        gotBlob(data);
                    });
                `
                doc.body.appendChild(src);
            });
            doc.head.appendChild(pdfSrc);
        })
}

function makePuppet(url) {
    return new Promise((resolve, reject) => {
        let puppet = window.open(url);
        puppet.addEventListener("DOMContentLoaded", () => {
            resolve(puppet);
        })
    })
}