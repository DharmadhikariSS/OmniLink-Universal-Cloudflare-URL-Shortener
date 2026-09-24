/**
 * Compact, self-contained QR Code generator (zero dependencies)
 * Generates QR Code matrix and renders to Canvas / SVG
 */
(function(global) {
    // Standard minimal QR Code Generator
    function QR8bitByte(data) {
        this.mode = 4; // 8-bit byte
        this.data = data;
    }
    QR8bitByte.prototype = {
        getLength: function() { return this.data.length; },
        write: function(buffer) {
            for (var i = 0; i < this.data.length; i++) {
                buffer.put(this.data.charCodeAt(i), 8);
            }
        }
    };

    function QRCode(typeNumber, errorCorrectLevel) {
        this.typeNumber = typeNumber;
        this.errorCorrectLevel = errorCorrectLevel;
        this.modules = null;
        this.moduleCount = 0;
        this.dataCache = null;
        this.dataList = [];
    }

    QRCode.prototype = {
        addData: function(data) {
            var newData = new QR8bitByte(data);
            this.dataList.push(newData);
            this.dataCache = null;
        },
        isDark: function(row, col) {
            if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
                throw new Error(row + "," + col);
            }
            return this.modules[row][col];
        },
        getModuleCount: function() { return this.moduleCount; },
        make: function() {
            if (this.typeNumber < 1) {
                var typeNumber = 1;
                for (typeNumber = 1; typeNumber < 40; typeNumber++) {
                    var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);
                    var buffer = new QRBitBuffer();
                    var totalDataCount = 0;
                    for (var i = 0; i < rsBlocks.length; i++) {
                        totalDataCount += rsBlocks[i].dataCount;
                    }
                    for (var i = 0; i < this.dataList.length; i++) {
                        var data = this.dataList[i];
                        buffer.put(data.mode, 4);
                        buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber));
                        data.write(buffer);
                    }
                    if (buffer.getLengthInBits() <= totalDataCount * 8) break;
                }
                this.typeNumber = typeNumber;
            }
            this.makeImpl(false, this.getBestMaskPattern());
        },
        makeImpl: function(test, maskPattern) {
            this.moduleCount = this.typeNumber * 4 + 17;
            this.modules = new Array(this.moduleCount);
            for (var row = 0; row < this.moduleCount; row++) {
                this.modules[row] = new Array(this.moduleCount);
                for (var col = 0; col < this.moduleCount; col++) {
                    this.modules[row][col] = null;
                }
            }
            this.setupPositionProbePattern(0, 0);
            this.setupPositionProbePattern(this.moduleCount - 7, 0);
            this.setupPositionProbePattern(0, this.moduleCount - 7);
            this.setupPositionAdjustPattern();
            this.setupTimingPattern();
            this.setupTypeInfo(test, maskPattern);
            if (this.typeNumber >= 7) this.setupTypeNumber(test);
            if (this.dataCache == null) {
                this.dataCache = QRCode.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
            }
            this.mapData(this.dataCache, maskPattern);
        },
        setupPositionProbePattern: function(row, col) {
            for (var r = -1; r <= 7; r++) {
                if (row + r <= -1 || this.moduleCount <= row + r) continue;
                for (var c = -1; c <= 7; c++) {
                    if (col + c <= -1 || this.moduleCount <= col + c) continue;
                    if ((0 <= r && r <= 6 && (c == 0 || c == 6)) ||
                        (0 <= c && c <= 6 && (r == 0 || r == 6)) ||
                        (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
                        this.modules[row + r][col + c] = true;
                    } else {
                        this.modules[row + r][col + c] = false;
                    }
                }
            }
        },
        getBestMaskPattern: function() {
            var minLostPoint = 0;
            var pattern = 0;
            for (var i = 0; i < 8; i++) {
                this.makeImpl(true, i);
                var lostPoint = QRUtil.getLostPoint(this);
                if (i == 0 || minLostPoint > lostPoint) {
                    minLostPoint = lostPoint;
                    pattern = i;
                }
            }
            return pattern;
        },
        setupTimingPattern: function() {
            for (var r = 8; r < this.moduleCount - 8; r++) {
                if (this.modules[r][6] != null) continue;
                this.modules[r][6] = (r % 2 == 0);
            }
            for (var c = 8; c < this.moduleCount - 8; c++) {
                if (this.modules[6][c] != null) continue;
                this.modules[6][c] = (c % 2 == 0);
            }
        },
        setupPositionAdjustPattern: function() {
            var pos = QRUtil.getPatternPosition(this.typeNumber);
            for (var i = 0; i < pos.length; i++) {
                for (var j = 0; j < pos.length; j++) {
                    var row = pos[i];
                    var col = pos[j];
                    if (this.modules[row][col] != null) continue;
                    for (var r = -2; r <= 2; r++) {
                        for (var c = -2; c <= 2; c++) {
                            if (r == -2 || r == 2 || c == -2 || c == 2 || (r == 0 && c == 0)) {
                                this.modules[row + r][col + c] = true;
                            } else {
                                this.modules[row + r][col + c] = false;
                            }
                        }
                    }
                }
            }
        },
        setupTypeNumber: function(test) {
            var bits = QRUtil.getBCHTypeNumber(this.typeNumber);
            for (var i = 0; i < 18; i++) {
                var mod = (!test && ((bits >> i) & 1) == 1);
                this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
            }
            for (var i = 0; i < 18; i++) {
                var mod = (!test && ((bits >> i) & 1) == 1);
                this.modules[i % 3 + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
            }
        },
        setupTypeInfo: function(test, maskPattern) {
            var data = (this.errorCorrectLevel << 3) | maskPattern;
            var bits = QRUtil.getBCHTypeInfo(data);
            for (var i = 0; i < 15; i++) {
                var mod = (!test && ((bits >> i) & 1) == 1);
                if (i < 6) this.modules[i][8] = mod;
                else if (i < 8) this.modules[i + 1][8] = mod;
                else this.modules[this.moduleCount - 15 + i][8] = mod;
            }
            for (var i = 0; i < 15; i++) {
                var mod = (!test && ((bits >> i) & 1) == 1);
                if (i < 8) this.modules[8][this.moduleCount - i - 1] = mod;
                else if (i < 9) this.modules[8][15 - i - 1 + 1] = mod;
                else this.modules[8][15 - i - 1] = mod;
            }
            this.modules[this.moduleCount - 8][8] = (!test);
        },
        mapData: function(data, maskPattern) {
            var inc = -1;
            var row = this.moduleCount - 1;
            var bitIndex = 7;
            var byteIndex = 0;
            var maskFunc = QRUtil.getMaskFunction(maskPattern);
            for (var col = this.moduleCount - 1; col > 0; col -= 2) {
                if (col == 6) col--;
                while (true) {
                    for (var c = 0; c < 2; c++) {
                        if (this.modules[row][col - c] == null) {
                            var dark = false;
                            if (byteIndex < data.length) {
                                dark = (((data[byteIndex] >>> bitIndex) & 1) == 1);
                            }
                            var mask = maskFunc(row, col - c);
                            if (mask) dark = !dark;
                            this.modules[row][col - c] = dark;
                            bitIndex--;
                            if (bitIndex == -1) {
                                byteIndex++;
                                bitIndex = 7;
                            }
                        }
                    }
                    row += inc;
                    if (row < 0 || this.moduleCount <= row) {
                        row -= inc;
                        inc = -inc;
                        break;
                    }
                }
            }
        }
    };

    QRCode.createData = function(typeNumber, errorCorrectLevel, dataList) {
        var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
        var buffer = new QRBitBuffer();
        for (var i = 0; i < dataList.length; i++) {
            var data = dataList[i];
            buffer.put(data.mode, 4);
            buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber));
            data.write(buffer);
        }
        var totalDataCount = 0;
        for (var i = 0; i < rsBlocks.length; i++) {
            totalDataCount += rsBlocks[i].dataCount;
        }
        if (buffer.getLengthInBits() > totalDataCount * 8) {
            throw new Error("Code length overflow (" + buffer.getLengthInBits() + ">" + (totalDataCount * 8) + ")");
        }
        if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) buffer.put(0, 4);
        while (buffer.getLengthInBits() % 8 != 0) buffer.putBit(false);
        while (true) {
            if (buffer.getLengthInBits() >= totalDataCount * 8) break;
            buffer.put(0xEC, 8);
            if (buffer.getLengthInBits() >= totalDataCount * 8) break;
            buffer.put(0x11, 8);
        }
        return QRCode.createBytes(buffer, rsBlocks);
    };

    QRCode.createBytes = function(buffer, rsBlocks) {
        var offset = 0;
        var maxDcCount = 0;
        var maxEcCount = 0;
        var dcdata = new Array(rsBlocks.length);
        var ecdata = new Array(rsBlocks.length);
        for (var r = 0; r < rsBlocks.length; r++) {
            var dcCount = rsBlocks[r].dataCount;
            var ecCount = rsBlocks[r].totalCount - dcCount;
            maxDcCount = Math.max(maxDcCount, dcCount);
            maxEcCount = Math.max(maxEcCount, ecCount);
            dcdata[r] = new Array(dcCount);
            for (var i = 0; i < dcdata[r].length; i++) {
                dcdata[r][i] = 0xFF & buffer.buffer[i + offset];
            }
            offset += dcCount;
            var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
            var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
            var modPoly = rawPoly.mod(rsPoly);
            ecdata[r] = new Array(rsPoly.getLength() - 1);
            for (var i = 0; i < ecdata[r].length; i++) {
                var modIndex = i + modPoly.getLength() - ecdata[r].length;
                ecdata[r][i] = (modIndex >= 0) ? modPoly.get(modIndex) : 0;
            }
        }
        var totalCodeCount = 0;
        for (var i = 0; i < rsBlocks.length; i++) totalCodeCount += rsBlocks[i].totalCount;
        var data = new Array(totalCodeCount);
        var index = 0;
        for (var i = 0; i < maxDcCount; i++) {
            for (var r = 0; r < rsBlocks.length; r++) {
                if (i < dcdata[r].length) data[index++] = dcdata[r][i];
            }
        }
        for (var i = 0; i < maxEcCount; i++) {
            for (var r = 0; r < rsBlocks.length; r++) {
                if (i < ecdata[r].length) data[index++] = ecdata[r][i];
            }
        }
        return data;
    };

    var QRUtil = {
        PATTERN_POSITION_TABLE: [
            [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42],
            [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66]
        ],
        G15: (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
        G18: (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
        G15_MASK: (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1),
        getBCHTypeInfo: function(data) {
            var d = data << 10;
            while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
                d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15)));
            }
            return ((data << 10) | d) ^ QRUtil.G15_MASK;
        },
        getBCHTypeNumber: function(data) {
            var d = data << 12;
            while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
                d ^= (QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18)));
            }
            return (data << 12) | d;
        },
        getBCHDigit: function(data) {
            var digit = 0;
            while (data != 0) { digit++; data >>>= 1; }
            return digit;
        },
        getPatternPosition: function(typeNumber) {
            return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1] || [];
        },
        getMaskFunction: function(maskPattern) {
            switch (maskPattern) {
                case 0: return function(i, j) { return (i + j) % 2 == 0; };
                case 1: return function(i, j) { return i % 2 == 0; };
                case 2: return function(i, j) { return j % 3 == 0; };
                case 3: return function(i, j) { return (i + j) % 3 == 0; };
                case 4: return function(i, j) { return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0; };
                case 5: return function(i, j) { return (i * j) % 2 + (i * j) % 3 == 0; };
                case 6: return function(i, j) { return ((i * j) % 2 + (i * j) % 3) % 2 == 0; };
                case 7: return function(i, j) { return ((i * j) % 3 + (i + j) % 2) % 2 == 0; };
                default: throw new Error("bad maskPattern:" + maskPattern);
            }
        },
        getErrorCorrectPolynomial: function(errorCorrectLength) {
            var a = new QRPolynomial([1], 0);
            for (var i = 0; i < errorCorrectLength; i++) {
                a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
            }
            return a;
        },
        getLengthInBits: function(mode, type) {
            if (1 <= type && type < 10) return 8;
            return 16;
        },
        getLostPoint: function(qrCode) {
            var moduleCount = qrCode.getModuleCount();
            var lostPoint = 0;
            for (var row = 0; row < moduleCount; row++) {
                for (var col = 0; col < moduleCount; col++) {
                    var sameCount = 0;
                    var dark = qrCode.isDark(row, col);
                    for (var r = -1; r <= 1; r++) {
                        if (row + r < 0 || moduleCount <= row + r) continue;
                        for (var c = -1; c <= 1; c++) {
                            if (col + c < 0 || moduleCount <= col + c) continue;
                            if (r == 0 && c == 0) continue;
                            if (dark == qrCode.isDark(row + r, col + c)) sameCount++;
                        }
                    }
                    if (sameCount > 5) lostPoint += (3 + sameCount - 5);
                }
            }
            return lostPoint;
        }
    };

    var QRMath = {
        glog: function(n) {
            if (n < 1) throw new Error("glog(" + n + ")");
            return QRMath.LOG_TABLE[n];
        },
        gexp: function(n) {
            while (n < 0) n += 255;
            while (n >= 256) n -= 255;
            return QRMath.EXP_TABLE[n];
        },
        EXP_TABLE: new Array(256),
        LOG_TABLE: new Array(256)
    };
    for (var i = 0; i < 8; i++) QRMath.EXP_TABLE[i] = 1 << i;
    for (var i = 8; i < 256; i++) QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4] ^ QRMath.EXP_TABLE[i - 5] ^ QRMath.EXP_TABLE[i - 6] ^ QRMath.EXP_TABLE[i - 8];
    for (var i = 0; i < 255; i++) QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;

    function QRPolynomial(num, shift) {
        if (num.length == undefined) throw new Error(num.length + "/" + shift);
        var offset = 0;
        while (offset < num.length && num[offset] == 0) offset++;
        this.num = new Array(num.length - offset + shift);
        for (var i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
    }
    QRPolynomial.prototype = {
        get: function(index) { return this.num[index]; },
        getLength: function() { return this.num.length; },
        multiply: function(e) {
            var num = new Array(this.getLength() + e.getLength() - 1);
            for (var i = 0; i < this.getLength(); i++) {
                for (var j = 0; j < e.getLength(); j++) {
                    num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
                }
            }
            return new QRPolynomial(num, 0);
        },
        mod: function(e) {
            if (this.getLength() - e.getLength() < 0) return this;
            var ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
            var num = new Array(this.getLength());
            for (var i = 0; i < this.getLength(); i++) num[i] = this.get(i);
            for (var i = 0; i < e.getLength(); i++) {
                num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
            }
            return new QRPolynomial(num, 0).mod(e);
        }
    };

    function QRRSBlock(totalCount, dataCount) {
        this.totalCount = totalCount;
        this.dataCount = dataCount;
    }
    QRRSBlock.RS_BLOCK_TABLE = [
        [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
        [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
        [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
        [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
        [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12],
        [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15]
    ];
    QRRSBlock.getRSBlocks = function(typeNumber, errorCorrectLevel) {
        var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
        var length = rsBlock.length / 3;
        var list = [];
        for (var i = 0; i < length; i++) {
            var count = rsBlock[i * 3 + 0];
            var totalCount = rsBlock[i * 3 + 1];
            var dataCount = rsBlock[i * 3 + 2];
            for (var j = 0; j < count; j++) list.push(new QRRSBlock(totalCount, dataCount));
        }
        return list;
    };
    QRRSBlock.getRsBlockTable = function(typeNumber, errorCorrectLevel) {
        var index = (typeNumber - 1) * 4 + errorCorrectLevel;
        return QRRSBlock.RS_BLOCK_TABLE[index] || QRRSBlock.RS_BLOCK_TABLE[0];
    };

    function QRBitBuffer() {
        this.buffer = [];
        this.length = 0;
    }
    QRBitBuffer.prototype = {
        get: function(index) {
            var bufIndex = Math.floor(index / 8);
            return ((this.buffer[bufIndex] >>> (7 - index % 8)) & 1) == 1;
        },
        put: function(num, length) {
            for (var i = 0; i < length; i++) {
                this.putBit(((num >>> (length - i - 1)) & 1) == 1);
            }
        },
        getLengthInBits: function() { return this.length; },
        putBit: function(bit) {
            var bufIndex = Math.floor(this.length / 8);
            if (this.buffer.length <= bufIndex) this.buffer.push(0);
            if (bit) this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
            this.length++;
        }
    };

    // Helper for rounded rectangles with fallback for older browsers
    function drawRoundedRect(ctx, x, y, w, h, r) {
        if (ctx.roundRect) {
            ctx.roundRect(x, y, w, h, r);
            return;
        }
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    // Preset Brand SVG Icons (as clean Base64 Data URIs for universal browser & SVG support)
    var PRESET_LOGOS = {
        lightning: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0Ij48cG9seWdvbiBwb2ludHM9IjEzIDIgMyAxNCAxMiAxNCAxMSAyMiAyMSAxMCAxMiAxMCAxMyAyIiBmaWxsPSIjMTBiOTgxIi8+PC9zdmc+',
        link: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxMGI5ODEiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMCAxM2E1IDUgMCAwIDAgNy41NC41NGwzLTNhNSA1IDAgMCAwLTcuMDctNy4wN2wtMS43MiAxLjcxIi8+PHBhdGggZD0iTTE0IDExYTUgNSAwIDAgMC03LjU0LS41NGwtMyAzYTUgNSAwIDAgMCA3LjA3IDcuMDdsMS43MS0xLjcxIi8+PC9zdmc+',
        globe: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSJub25lIiBzdHJva2U9IiMzYjgyZjYiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PGxpbmUgeDE9IjIiIHkxPSIxMiIgeDI9IjIyIiB5Mj0iMTIiLz48cGF0aCBkPSJNMTIgMmExNS4zIDE1LjMgMCAwIDEgNCAxMCAxNS4zIDE1LjMgMCAwIDEtNCAxMCAxNS4zIDE1LjMgMCAwIDEgNC0xMHoiLz48L3N2Zz4=',
        github: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMTgxODFiIj48cGF0aCBkPSJNMTIgMEM1LjM3IDAgMCA1LjM3IDAgMTJjMCA1LjMxIDMuNDM1IDkuNzk1IDguMjA1IDExLjM4NS42LjEwNS44MjUtLjI1NS44MjUtLjU3IDAtLjI4NS0uMDE1LTEuMjMtLjAxNS0yLjIzNS0zLjAxNS41NTUtMy43OTUtLjczNS00LjAzNS0xLjQxLS4xMzUtLjM0NS0uNzItMS40MS0xLjIzLTEuNjk1LS40Mi0uMjI1LTEuMDItLjc4LS4wMTUtLjc5NS45NDUtLjAxNSAxLjYyLjg3IDEuODQ1IDEuMjMgMS4wOCAxLjgxNSAyLjgwNSAxLjMwNSAzLjQ5NS45OS4xMDUtLjc4LjQyLTEuMzA1Ljc2NS0xLjYwNS0yLjY3LS4zLTUuNDYtMS4zMzUtNS40Ni01LjkyNSAwLTEuMzA1LjQ2NS0yLjM4NSAxLjIzLTMuMjI1LS4xMi0uMy0uNTQtMS41My4xMi0zLjE4IDAgMCAxLjAwNS0uMzE1IDMuMyAxLjIzLjk2LS4yNyAxLjk4LS40MDUgMy0uNDA1czIuMDQuMTM1IDMgLjQwNWMyLjI5NS0xLjU2IDMuMy0xLjIzIDMuMy0xLjIzLjY2IDEuNjUuMjQgMi44OC4xMiAzLjE4Ljc2NS44NCAxLjIzIDEuOTA1IDEuMjMgMy4yMjUgMCA0LjYwNS0yLjgwNSA1LjYyNS01LjQ3NSA1LjkyNS40MzUuMzc1LjgxIDEuMDk1LjgxIDIuMjIgMCAxLjYwNS0uMDE1IDIuODk1LS4wMTUgMy4zIDAgLjMxNS4yMjUuNjkuODI1LjU3QTEyLjAyIDEyLjAyIDAgMCAwIDI0IDEyYzAtNi42My01LjM3LTEyLTEyLTEyeiIvPjwvc3ZnPg==',
        whatsapp: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMjVEMzY2Ij48cGF0aCBkPSJNMTcuNDcyIDE0LjM4MmMtLjMwMS0uMTUtMS43OC0uODc5LTIuMDU2LS45OC0uMjc2LS4xLS40NzYtLjE1LS42NzYuMTUtLjIuMzAxLS43NzYuOTgtLjk1MiAxLjE4LS4xNzUuMi0uMzUxLjIyNi0uNjUyLjA3Ni0uMzAxLS4xNS0xLjI3Mi0uNDY5LTIuNDIzLTEuNDk3LS44OTUtLjc5OC0xLjUtMS43ODUtMS42NzUtMi4wODYtLjE3Ni0uMzAxLS4wMTktLjQ2NC4xMzItLjYxNC4xMzYtLjEzNS4zMDEtLjM1MS40NTItLjUyNi4xNS0uMTc1LjItLjMwMS4zLS41MDIuMTAxLS4yLjA1MS0uMzc2LS4wMjUtLjUyNi0uMDc1LS4xNS0uNjc2LTEuNjMtLjkyNi0yLjIzMy0uMjQzLS41ODctLjQ5LS41MDctLjY3Ni0uNTE2bC0uNTc2LS4wMWMtLjIgMC0uNTI2LjA3NS0uODAyLjM3NnMtMS4wNTMgMS4wMjgtMS4wNTMgMi41MDggMS4wNzggMi45MDkgMS4yMjkgMy4xMWMuMTUuMiAyLjEyMiAzLjI0IDUuMTQgNC41NDQuNzE4LjMxIDEuMjc5LjQ5NiAxLjcxNi42MzUuNzIyLjIzIDEuMzc4LjE5NyAxLjg5OC4xMi41NzktLjA4NyAxLjc4LS43MjcgMi4wMy0xLjQzLjI1MS0uNzAyLjI1MS0xLjMwNC4xNzYtMS40My0uMDc2LS4xMjYtLjI3Ni0uMjAxLS41NzctLjM1MXpNMTIuMDUgMkM2LjUyNyAyIDIuMDQzIDYuNDg0IDIuMDQzIDEyLjAwN2MwIDEuOTcuNTc0IDMuODA1IDEuNTY0IDUuMzU4TDIgMjJsNC44MS0xLjU3MmE5Ljk2IDkuOTYgMCAwIDAgNS4yNCAxLjQ4MmguMDA0YzUuNTIyIDAgMTAuMDA2LTQuNDg0IDEwLjAwNi0xMC4wMDdDMjIuMDYgNi40ODQgMTcuNTc0IDIgMTIuMDUgMnoiLz48L3N2Zz4='
    };

    var PRESET_IMAGES = {};
    if (typeof Image !== 'undefined') {
        for (var pKey in PRESET_LOGOS) {
            var pImg = new Image();
            pImg.src = PRESET_LOGOS[pKey];
            PRESET_IMAGES[pKey] = pImg;
        }
    }

    function isFinderPattern(r, c, count) {
        if (r < 7 && c < 7) return true; // Top-left
        if (r < 7 && c >= count - 7) return true; // Top-right
        if (r >= count - 7 && c < 7) return true; // Bottom-left
        return false;
    }

    function parseOptions(arg1, arg2, arg3, arg4, arg5) {
        if (typeof arg1 === 'object' && arg1 !== null) {
            return arg1;
        }
        return {
            text: arg1,
            canvas: arg2,
            color: arg3 || '#000000',
            bgColor: arg4 || '#ffffff',
            margin: arg5 !== undefined ? arg5 : 2
        };
    }

    // Global Public QR Drawer
    global.OmniQR = {
        PRESET_LOGOS: PRESET_LOGOS,
        PRESET_IMAGES: PRESET_IMAGES,

        /**
         * Renders QR code to an HTML Canvas element
         */
        renderCanvas: function(arg1, arg2, arg3, arg4, arg5) {
            var opts = parseOptions(arg1, arg2, arg3, arg4, arg5);
            var text = opts.text || '';
            var canvas = opts.canvas;
            if (!canvas) return;

            var color = opts.color || '#000000';
            var bgColor = opts.bgColor || '#ffffff';
            var dotShape = opts.dotShape || 'square'; // 'square' | 'rounded' | 'dots'
            var headerText = (opts.headerText || '').trim();
            var captionText = (opts.captionText || '').trim();
            var logo = opts.logoImg || null;
            if (logo === 'none') logo = null;
            if (typeof logo === 'string') {
                if (PRESET_IMAGES[logo]) {
                    logo = PRESET_IMAGES[logo];
                } else if (PRESET_LOGOS[logo]) {
                    logo = PRESET_LOGOS[logo];
                }
            }
            var margin = opts.margin !== undefined ? opts.margin : 2;

            // Error Correction: Level 3 (H = 30%) when logo is used, else Level 1 (M = 15%)
            var ecLevel = logo ? 3 : 1;
            var qr = new QRCode(0, ecLevel);
            try {
                qr.addData(text);
                qr.make();
            } catch (e) {
                // If text is large, fallback to Level 1 (M)
                qr = new QRCode(0, 1);
                qr.addData(text);
                qr.make();
            }

            var count = qr.getModuleCount();
            var ctx = canvas.getContext('2d');
            var width = canvas.width;
            
            // Layout calculations for text
            var headerHeight = headerText ? Math.round(width * 0.12) : 0;
            var captionHeight = captionText ? Math.round(width * 0.14) : 0;
            var qrAreaSize = width;
            var totalHeight = qrAreaSize + headerHeight + captionHeight;
            canvas.height = totalHeight;

            // Background fill
            ctx.clearRect(0, 0, width, totalHeight);
            if (bgColor !== 'transparent') {
                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, width, totalHeight);
            }

            // Draw Top Header Text
            if (headerText) {
                ctx.fillStyle = color === '#ffffff' ? '#f4f4f5' : (bgColor === '#09090b' ? '#f4f4f5' : '#18181b');
                var fontSize = Math.max(Math.round(width * 0.048), 12);
                ctx.font = '700 ' + fontSize + 'px Inter, system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(headerText, width / 2, headerHeight * 0.55);
            }

            // QR matrix layout — must be declared before badge pre-computation
            var qrOffsetY = headerHeight;
            var cellSize = qrAreaSize / (count + 2 * margin);

            // Pre-compute badge bounds if logo is present
            // Badges must be calculated BEFORE module drawing so we can skip dots inside the zone
            var badgeX = 0, badgeY = 0, badgeSize = 0, badgeRadius = 0;
            var logoPad = 0, drawLogoX = 0, drawLogoY2 = 0, drawLogoSize = 0;
            var hasBadge = Boolean(logo);

            if (hasBadge) {
                // QR matrix actual pixel area (inside margins)
                var qrMatrixPx = count * cellSize;
                var qrMatrixLeft = margin * cellSize;          // x offset within qrAreaSize
                var qrMatrixTop  = qrOffsetY + margin * cellSize; // y offset in canvas

                // Badge = 15% of matrix width (area coverage ≈ 2.25%) — safely inside 30% EC-H
                badgeSize   = qrMatrixPx * 0.15;
                badgeX      = qrMatrixLeft + (qrMatrixPx - badgeSize) / 2;
                badgeY      = qrMatrixTop  + (qrMatrixPx - badgeSize) / 2;
                badgeRadius = badgeSize * 0.22;
                logoPad     = badgeSize * 0.12;
                drawLogoX   = badgeX + logoPad;
                drawLogoY2  = badgeY + logoPad;
                drawLogoSize = badgeSize - 2 * logoPad;
            }

            // Draw QR Matrix — skipping any module whose center falls inside the badge zone
            ctx.fillStyle = color;

            for (var r = 0; r < count; r++) {
                for (var c = 0; c < count; c++) {
                    if (qr.isDark(r, c)) {
                        var x = (c + margin) * cellSize;
                        var y = qrOffsetY + (r + margin) * cellSize;

                        // Skip dots that fall inside the logo badge zone (leave as background)
                        // Using cell center for the overlap check
                        if (hasBadge) {
                            var cx2 = x + cellSize / 2;
                            var cy2 = y + cellSize / 2;
                            if (cx2 >= badgeX && cx2 <= badgeX + badgeSize &&
                                cy2 >= badgeY && cy2 <= badgeY + badgeSize) {
                                continue; // skip — EC-H will recover these erasures
                            }
                        }

                        var isFinder = isFinderPattern(r, c, count);

                        if (isFinder || dotShape === 'square') {
                            ctx.fillRect(x, y, cellSize + 0.4, cellSize + 0.4);
                        } else if (dotShape === 'dots') {
                            ctx.beginPath();
                            ctx.arc(x + cellSize / 2, y + cellSize / 2, (cellSize / 2) * 0.88, 0, Math.PI * 2);
                            ctx.fill();
                        } else if (dotShape === 'rounded') {
                            var radius = cellSize * 0.35;
                            ctx.beginPath();
                            drawRoundedRect(ctx, x, y, cellSize + 0.3, cellSize + 0.3, radius);
                            ctx.fill();
                        }
                    }
                }
            }

            // Draw Badge + Logo on top (dots underneath are already cleared)
            if (hasBadge) {
                // White badge background
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                drawRoundedRect(ctx, badgeX, badgeY, badgeSize, badgeSize, badgeRadius);
                ctx.fill();

                // Subtle border
                ctx.strokeStyle = 'rgba(0,0,0,0.08)';
                ctx.lineWidth = Math.max(cellSize * 0.3, 0.5);
                ctx.stroke();

                // Draw Logo
                var drawLogo = function(img) {
                    try {
                        ctx.drawImage(img, drawLogoX, drawLogoY2, drawLogoSize, drawLogoSize);
                    } catch (e) {
                        console.warn('Failed to draw logo on canvas:', e);
                    }
                };

                if (logo instanceof HTMLImageElement) {
                    if (logo.complete && logo.naturalWidth > 0) {
                        drawLogo(logo);
                    } else {
                        logo.onload  = function() { drawLogo(logo); };
                        logo.onerror = function() { console.warn('Logo image failed to load'); };
                    }
                } else if (typeof logo === 'string') {
                    var logoImg2 = new Image();
                    // Only set crossOrigin for actual remote URLs, not data URIs
                    if (logo.startsWith('http://') || logo.startsWith('https://')) {
                        logoImg2.crossOrigin = 'anonymous';
                    }
                    logoImg2.onload  = function() { drawLogo(logoImg2); };
                    logoImg2.onerror = function() { console.warn('Logo failed to load'); };
                    logoImg2.src = logo;
                }
            }

            // Draw Bottom Caption Text
            if (captionText) {
                var captionY = qrOffsetY + qrAreaSize + (captionHeight * 0.45);
                ctx.fillStyle = color === '#ffffff' ? '#a1a1aa' : (bgColor === '#09090b' ? '#a1a1aa' : '#52525b');
                var capSize = Math.max(Math.round(width * 0.042), 11);
                ctx.font = '600 ' + capSize + 'px Inter, system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(captionText, width / 2, captionY);
            }
        },

        /**
         * Generates an SVG string representation of the styled QR code
         */
        generateSVG: function(arg1, arg2, arg3, arg4) {
            var opts = (typeof arg1 === 'object' && arg1 !== null) ? arg1 : {
                text: arg1,
                color: arg2 || '#000000',
                bgColor: arg3 || '#ffffff',
                margin: arg4 !== undefined ? arg4 : 2
            };

            var text = opts.text || '';
            var color = opts.color || '#000000';
            var bgColor = opts.bgColor || '#ffffff';
            var dotShape = opts.dotShape || 'square';
            var headerText = (opts.headerText || '').trim();
            var captionText = (opts.captionText || '').trim();
            var logo = opts.logoImg || null;
            if (logo === 'none') logo = null;
            var margin = opts.margin !== undefined ? opts.margin : 2;

            var ecLevel = logo ? 3 : 1;
            var qr = new QRCode(0, ecLevel);
            try {
                qr.addData(text);
                qr.make();
            } catch (e) {
                qr = new QRCode(0, 1);
                qr.addData(text);
                qr.make();
            }

            var count = qr.getModuleCount();
            var qrDim = count + 2 * margin;
            var headerHeight = headerText ? Math.round(qrDim * 0.15) : 0;
            var captionHeight = captionText ? Math.round(qrDim * 0.15) : 0;
            var totalHeight = qrDim + headerHeight + captionHeight;

            var elements = [];

            // Background
            if (bgColor !== 'transparent') {
                elements.push(`<rect width="${qrDim}" height="${totalHeight}" fill="${bgColor}"/>`);
            }

            // Header Text
            if (headerText) {
                var escapedHeader = headerText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                var headerColor = (bgColor === '#09090b') ? '#f4f4f5' : '#18181b';
                elements.push(`<text x="${qrDim / 2}" y="${headerHeight * 0.65}" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="${qrDim * 0.05}" fill="${headerColor}" text-anchor="middle">${escapedHeader}</text>`);
            }

            // Modules
            var qrOffsetY = headerHeight;
            for (var r = 0; r < count; r++) {
                for (var c = 0; c < count; c++) {
                    if (qr.isDark(r, c)) {
                        var x = c + margin;
                        var y = qrOffsetY + r + margin;
                        var isFinder = isFinderPattern(r, c, count);

                        if (isFinder || dotShape === 'square') {
                            elements.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`);
                        } else if (dotShape === 'dots') {
                            elements.push(`<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.44" fill="${color}"/>`);
                        } else if (dotShape === 'rounded') {
                            elements.push(`<rect x="${x}" y="${y}" width="1" height="1" rx="0.3" fill="${color}"/>`);
                        }
                    }
                }
            }

            // Center Logo Overlay
            if (logo) {
                // Badge sized at 18% of QR matrix (not full qrDim) for scannability
                var svgMatrixSize = count;
                var svgLogoRatio = 0.18;
                var badgeSize = svgMatrixSize * svgLogoRatio;
                var badgeX = margin + (svgMatrixSize - badgeSize) / 2;
                var badgeY = qrOffsetY + margin + (svgMatrixSize - badgeSize) / 2;

                elements.push(`<rect x="${badgeX}" y="${badgeY}" width="${badgeSize}" height="${badgeSize}" rx="${badgeSize * 0.22}" fill="#ffffff" stroke="rgba(0,0,0,0.10)" stroke-width="${badgeSize * 0.04}"/>`);

                var logoSrc = typeof logo === 'string' ? (PRESET_LOGOS[logo] || logo) : (logo.src || '');
                if (logoSrc) {
                    var pad = badgeSize * 0.14;
                    elements.push(`<image href="${logoSrc}" x="${badgeX + pad}" y="${badgeY + pad}" width="${badgeSize - 2 * pad}" height="${badgeSize - 2 * pad}"/>`);
                }
            }

            // Caption Text
            if (captionText) {
                var escapedCaption = captionText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                var captionColor = (bgColor === '#09090b') ? '#a1a1aa' : '#52525b';
                elements.push(`<text x="${qrDim / 2}" y="${qrOffsetY + qrDim + captionHeight * 0.55}" font-family="Inter, system-ui, sans-serif" font-weight="600" font-size="${qrDim * 0.042}" fill="${captionColor}" text-anchor="middle">${escapedCaption}</text>`);
            }

            return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${qrDim} ${totalHeight}" width="600" height="${Math.round(600 * (totalHeight / qrDim))}">
                ${elements.join('\n')}
            </svg>`;
        },

        /**
         * Renders to high-res canvas (1024px) for crisp download & clipboard copying
         */
        renderToExportCanvas: function(opts, targetWidth = 1024) {
            var exportCanvas = document.createElement('canvas');
            exportCanvas.width = targetWidth;
            var merged = Object.assign({}, opts, { canvas: exportCanvas });
            this.renderCanvas(merged);
            return exportCanvas;
        }
    };
})(window);

