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

    // Preset Brand SVG Icons (as clean Data URIs for canvas & SVG embedding)
    var PRESET_LOGOS = {
        lightning: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="%2310b981"/></svg>',
        link: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="%2310b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
        globe: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="%233b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
        github: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64" fill="%2318181b"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>',
        whatsapp: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64" fill="%2325D366"><path d="M17.472 14.382c-.301-.15-1.78-.879-2.056-.98-.276-.1-.476-.15-.676.15-.2.301-.776.98-.952 1.18-.175.2-.351.226-.652.076-.301-.15-1.272-.469-2.423-1.497-.895-.798-1.5-1.785-1.675-2.086-.176-.301-.019-.464.132-.614.136-.135.301-.351.452-.526.15-.175.2-.301.3-.502.101-.2.051-.376-.025-.526-.075-.15-.676-1.63-.926-2.233-.243-.587-.49-.507-.676-.516l-.576-.01c-.2 0-.526.075-.802.376s-1.053 1.028-1.053 2.508 1.078 2.909 1.229 3.11c.15.2 2.122 3.24 5.14 4.544.718.31 1.279.496 1.716.635.722.23 1.378.197 1.898.12.579-.087 1.78-.727 2.03-1.43.251-.702.251-1.304.176-1.43-.076-.126-.276-.201-.577-.351zM12.05 2C6.527 2 2.043 6.484 2.043 12.007c0 1.97.574 3.805 1.564 5.358L2 22l4.81-1.572a9.96 9.96 0 0 0 5.24 1.482h.004c5.522 0 10.006-4.484 10.006-10.007C22.06 6.484 17.574 2 12.05 2z"/></svg>'
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

            // Draw QR Matrix
            var qrOffsetY = headerHeight;
            var cellSize = qrAreaSize / (count + 2 * margin);

            ctx.fillStyle = color;

            for (var r = 0; r < count; r++) {
                for (var c = 0; c < count; c++) {
                    if (qr.isDark(r, c)) {
                        var x = (c + margin) * cellSize;
                        var y = qrOffsetY + (r + margin) * cellSize;
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
                            if (ctx.roundRect) {
                                ctx.roundRect(x, y, cellSize + 0.3, cellSize + 0.3, radius);
                            } else {
                                ctx.rect(x, y, cellSize + 0.3, cellSize + 0.3);
                            }
                            ctx.fill();
                        }
                    }
                }
            }

            // Center Logo Overlay
            if (logo) {
                var logoSizeRatio = 0.22;
                var badgeSize = qrAreaSize * logoSizeRatio;
                var centerX = width / 2;
                var centerY = qrOffsetY + qrAreaSize / 2;
                var badgeX = centerX - badgeSize / 2;
                var badgeY = centerY - badgeSize / 2;

                // Protective Badge Background (circle/rounded)
                var badgeBg = (bgColor === 'transparent' || bgColor === '#09090b') ? '#ffffff' : '#ffffff';
                ctx.fillStyle = badgeBg;
                ctx.beginPath();
                var badgeRadius = badgeSize * 0.24;
                if (ctx.roundRect) {
                    ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, badgeRadius);
                } else {
                    ctx.rect(badgeX, badgeY, badgeSize, badgeSize);
                }
                ctx.fill();

                // Subtle shadow/border around badge
                ctx.strokeStyle = 'rgba(0,0,0,0.12)';
                ctx.lineWidth = Math.max(Math.round(cellSize * 0.4), 1);
                ctx.stroke();

                // Draw Logo Image
                var logoPad = badgeSize * 0.16;
                var drawLogo = function(img) {
                    ctx.drawImage(img, badgeX + logoPad, badgeY + logoPad, badgeSize - 2 * logoPad, badgeSize - 2 * logoPad);
                };

                if (logo instanceof HTMLImageElement && logo.complete && logo.naturalWidth > 0) {
                    drawLogo(logo);
                } else if (typeof logo === 'string') {
                    var img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = function() {
                        drawLogo(img);
                    };
                    img.src = logo;
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
                var logoSizeRatio = 0.22;
                var badgeSize = qrDim * logoSizeRatio;
                var badgeX = (qrDim - badgeSize) / 2;
                var badgeY = qrOffsetY + (qrDim - badgeSize) / 2;

                elements.push(`<rect x="${badgeX}" y="${badgeY}" width="${badgeSize}" height="${badgeSize}" rx="${badgeSize * 0.24}" fill="#ffffff" stroke="rgba(0,0,0,0.12)" stroke-width="${badgeSize * 0.05}"/>`);
                
                var logoSrc = typeof logo === 'string' ? (PRESET_LOGOS[logo] || logo) : (logo.src || '');
                if (logoSrc) {
                    var pad = badgeSize * 0.16;
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

