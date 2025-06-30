// ... import كما هو

const PublicExamPlayer = () => {
  // ... نفس التعاريف كما هي

  const handleCompoundAnswer = (questionId, partIndex, optIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || {}),
        [partIndex]: optIndex,
      }
    }));
  };

  // ... باقي useEffect والوظائف كما هي

  const currentQuestion = exam.questions[currentQuestionIndex];
  const currentAnswers = currentQuestion ? answers[currentQuestion.id] || [] : [];

  return (
    <div className="min-h-screen p-4 flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        {isFinished ? (
          // ... نفس عرض النتائج بدون تغيير
        ) : (
          <motion.div key="exam" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-4xl">
            <h2 className="text-2xl font-bold text-white text-center mb-6">{exam.title}</h2>

            {currentQuestion.video_url && (
              <div className="mb-6 rounded-lg overflow-hidden aspect-video bg-black border border-slate-700">
                <iframe
                  ref={videoRef}
                  width="100%"
                  height="100%"
                  src={currentQuestion.video_url.replace("watch?v=", "embed/") + '?autoplay=1'}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            )}

            <Card className="p-8 bg-slate-800/80 border-slate-700 mb-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-semibold text-white text-right flex-1">
                  {currentQuestionIndex + 1}. {currentQuestion.question}
                </h3>
                <div className="flex flex-col items-center gap-2">
                  {questionTimeLeft !== null && (
                    <div className="flex items-center gap-2 text-orange-400 font-mono text-lg">
                      <Clock className="w-5 h-5" />
                      <span>{formatTime(questionTimeLeft)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ✅ دعم عرض الأسئلة المركبة */}
              {currentQuestion.question_type === 'compound' ? (
                <div className="space-y-6">
                  {currentQuestion.parts?.map((part, partIndex) => (
                    <div
                      key={partIndex}
                      className="space-y-3 bg-slate-700/50 p-4 rounded border border-slate-600"
                    >
                      <p className="font-medium text-white">
                        شطر {partIndex + 1}: {part.text}
                      </p>
                      <div className="space-y-2">
                        {part.options.map((opt, optIndex) => (
                          <motion.div key={optIndex} whileHover={{ scale: 1.02 }}>
                            <button
                              onClick={() => handleCompoundAnswer(currentQuestion.id, partIndex, optIndex)}
                              className={`w-full p-4 text-right rounded-lg border-2 ${
                                answers[currentQuestion.id]?.[partIndex] === optIndex
                                  ? 'border-yellow-500 bg-yellow-500/20'
                                  : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                              }`}
                            >
                              <span className="text-lg text-white">{opt}</span>
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {currentQuestion.options.map((option, index) => (
                    <motion.div key={index} whileHover={{ scale: 1.02 }}>
                      <button
                        onClick={() => handleAnswerSelect(currentQuestion.id, index)}
                        className={`w-full p-4 text-right rounded-lg border-2 ${
                          currentAnswers.includes(index)
                            ? 'border-yellow-500 bg-yellow-500/20'
                            : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                        }`}
                      >
                        <span className="text-lg text-white">{option}</span>
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>

            <div className="flex justify-between items-center">
              <Button
                onClick={prevQuestion}
                disabled={currentQuestionIndex === 0}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
              >
                <ArrowRight className="w-4 h-4 ml-2" /> السابق
              </Button>
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => clearAnswer(currentQuestion.id)}
                  variant="outline"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                  disabled={currentAnswers.length === 0}
                >
                  <RotateCcw className="w-4 h-4 ml-2" />
                  إلغاء
                </Button>
                {currentQuestionIndex === exam.questions.length - 1 ? (
                  <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
                    إنهاء الاختبار <CheckCircle className="w-4 h-4 mr-2" />
                  </Button>
                ) : (
                  <Button onClick={nextQuestion}>
                    التالي <ArrowLeft className="w-4 h-4 mr-2" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PublicExamPlayer;
