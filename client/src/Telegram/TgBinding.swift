import Foundation

class TgBinding: ObservableObject {
    static let shared = TgBinding()

    let webhookBaseURL = "pawer-server.onrender.com"
    private let botUsername = "pawerapp_bot"
    let botLinkURL: URL?
    let uniqueID: String
    @Published var chatID: String?

    enum LinkedStatus {
        case linked
        case unlinked
    }

    var linkedStatus: LinkedStatus {
        chatID != nil ? .linked : .unlinked 
    }

    enum ConnectionState {
      case idle
      case waitingForTelegram
      case failed
    }

    private var webSocketTask: URLSessionWebSocketTask?
    @Published var connectionState: ConnectionState = .idle


    private init() {
        self.uniqueID = TgBinding.getOrCreateUniqueID()
        self.chatID = UserDefaults.standard.string(forKey: "telegram_chat_id")
        self.botLinkURL = URL(string: "https://t.me/\(botUsername)?start=\(uniqueID)")
    }

    private static func getOrCreateUniqueID() -> String {
        let key = "uuid_telegram"

        if let existingID = UserDefaults.standard.string(forKey: key) {
              return existingID
        }

        let newID = UUID().uuidString
        UserDefaults.standard.set(newID, forKey: key)
        return newID
    }

    func connectWebSocket() {
        let wsURL = URL(string: "wss://\(webhookBaseURL)/websocket")!

        webSocketTask = URLSession.shared.webSocketTask(with: wsURL)
        webSocketTask?.resume()
        receiveWebSocketMessage()

        print("WebSocket connecting to: \(wsURL)")

        sendRegistrationMessage()
    }

    private func receiveWebSocketMessage() {
        webSocketTask?.receive { result in
            switch result {
                case .success(let message):
                    self.handleWebSocketMessage(message)
                    self.receiveWebSocketMessage()
                case .failure(let error):
                    print("WebSocket receive error: \(error)")
                    DispatchQueue.main.async {
                        self.connectionState = .failed
                    }
            }
        }
    }

    private func handleWebSocketMessage(_ message: URLSessionWebSocketTask.Message) {
        switch message { 
            case .string(let text):
                print("📡 Received: \(text)")

                if text == "server_waiting" {
                    DispatchQueue.main.async {
                        self.connectionState = .waitingForTelegram
                    }
                    return
                } 
                
               if text.hasPrefix("linked_chatId:") {
                    DispatchQueue.main.async {
                        self.chatID = String(text.dropFirst(14))
                        self.connectionState = .idle
                        UserDefaults.standard.set(self.chatID, forKey: "telegram_chat_id")

                        self.webSocketTask?.cancel(with: .goingAway, reason: nil)
                        self.webSocketTask = nil
                        print("🔌 WebSocket disconnected")
                    }
                    return
                }

            case .data(let data):
                print("📡 Received data: \(data)")
            @unknown default:
                break
            }
    }

    private func sendRegistrationMessage() {
        let message = "register:\(uniqueID)"
        let wsMessage = URLSessionWebSocketTask.Message.string(message)

        webSocketTask?.send(wsMessage) { error in
            if let error = error {
                print("❌ Failed to send registration: \(error)")
                DispatchQueue.main.async {
                    self.connectionState = .failed
                }
            } else {
                print("✅ Registration sent successfully")
            }
        }
    }

    func unlinkTelegram() {
        self.chatID = nil
    }
 }
