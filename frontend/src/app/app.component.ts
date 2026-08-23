import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { ImageUploaderComponent } from './components/image-uploader/image-uploader.component';
import { ChatContainerComponent } from './components/chat-container/chat-container.component';
import { ChatInputComponent } from './components/chat-input/chat-input.component';
import { ImageModalComponent } from './components/image-modal/image-modal.component';
import { ChatService } from './services/chat.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    ImageUploaderComponent,
    ChatContainerComponent,
    ChatInputComponent,
    ImageModalComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  chatService = inject(ChatService);
}
