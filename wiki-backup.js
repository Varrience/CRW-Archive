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
            doc.body.querySelector(".vector-page-toolbar").remove();
            pdfSrc = doc.createElement("script");
            pdfSrc.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
            pdfSrc.addEventListener("load", () => {
                win.html2pdf(doc.body.querySelector(".mw-page-container"))
                    .outputPdf("blob")
                    .then(data => {
                        archiveBlobs.push({ title: encodeURIComponent(doc.title) + ".pdf", data: data });
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
                                    file.download = "Archive_" + Date().slice(0, 33);
                                    file.href = url;
                                    file.style.display = "hidden"
                                    document.body.appendChild(file);
                                    window.open(url);
                                })
                        }
                        win.close();
                    });
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
